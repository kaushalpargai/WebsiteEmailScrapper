require('dotenv').config();
const { chromium } = require('playwright');
const mysql = require('mysql2/promise');

// --- CONFIG ---
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ytextractordb_local',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const BATCH_SIZE = 50;

// --- EMAIL VALIDATION ---
const isValidEmail = (text) => {
    if (!text) return null;
    const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g);
    if (!matches) return null;

    const fileExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.zip', '.rar', '.mp3', '.mp4', '.avi', '.mov', '.exe', '.dll', '.iso', '.dmg', '.apk'];

    return matches.find(e => {
        const lowerEmail = e.toLowerCase();
        return !fileExtensions.some(ext => lowerEmail.endsWith(ext));
    });
};

// --- MAIN FUNCTION ---
const runScraper = async () => {
    try {
        console.log(`🚀 Database Email Scraper Started (DB-Only Mode - 50 channels per batch)\n`);

        // Create connection pool
        console.log(`🗄️ Connecting to MySQL database...`);
        const pool = await mysql.createPool(DB_CONFIG);
        const connection = await pool.getConnection();
        console.log(`✅ Connected to database: ${DB_CONFIG.database}\n`);

        // Check table structure
        console.log(`📋 Checking table structure...`);
        const [columns] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'channels' AND COLUMN_NAME = 'source'`
        );

        if (columns.length === 0) {
            console.log(`   Adding 'source' column...`);
            await connection.query(`ALTER TABLE channels ADD COLUMN source VARCHAR(255) DEFAULT NULL`);
        }
        console.log(`   ✅ Table structure verified\n`);

        let batchNumber = 0;
        let totalProcessed = 0;
        let totalFound = 0;
        const WAIT_INTERVAL = 5 * 60 * 1000; // 5 minutes

        let batchContinue = true;

        while (batchContinue) {
            batchNumber++;

            // Fetch next 50 channels with NULL email
            console.log(`\n📊 Batch ${batchNumber}: Fetching channels with no email (email IS NULL)...`);
            const [channels] = await connection.query(
                `SELECT * FROM channels WHERE email IS NULL LIMIT ?`,
                [BATCH_SIZE]
            );

            console.log(`   Found ${channels.length} channels to process\n`);

            if (channels.length === 0) {
                console.log(`⏸️  No channels with missing emails found.`);
                console.log(`\n📊 CURRENT STATUS:`);
                console.log(`   Batches completed: ${batchNumber - 1}`);
                console.log(`   Total channels processed: ${totalProcessed}`);
                console.log(`   Total emails found: ${totalFound}\n`);

                // Check if there are more channels total
                const [totalCount] = await connection.query(`SELECT COUNT(*) as count FROM channels`);
                const [processedCount] = await connection.query(`SELECT COUNT(*) as count FROM channels WHERE email IS NOT NULL`);
                
                console.log(`   Total channels in DB: ${totalCount[0].count}`);
                console.log(`   Channels with email: ${processedCount[0].count}`);
                console.log(`   Channels with NO email: ${totalCount[0].count - processedCount[0].count}\n`);

                console.log(`🔄 Waiting ${WAIT_INTERVAL / 1000 / 60} minutes before checking again...\n`);
                await new Promise(r => setTimeout(r, WAIT_INTERVAL));
                continue;
            }

            // Process channels
            console.log(`🔄 Launching Chromium browser for batch...`);
            let browser;
            const batchUpdates = [];
            let batchProcessedCount = 0;
            let batchFoundCount = 0;

            try {
                browser = await chromium.launch({
                    headless: true,
                    slowMo: 50
                });
                console.log(`✅ Browser launched\n`);

                for (let i = 0; i < channels.length; i++) {
                    const { id, channel_id, channel_name, website } = channels[i];
                    batchProcessedCount++;
                    totalProcessed++;

                    try {
                        console.log(`[${i + 1}/${channels.length}] Processing: ${channel_name} (ID: ${id})`);
                        
                        let foundEmail = null;
                        let source = null;

                        // 1. Try YouTube channel page
                        try {
                            const context = await browser.newContext();
                            const page = await context.newPage();
                            const youtubeUrl = `https://www.youtube.com/@${channel_id}`;
                            
                            await page.goto(youtubeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                            const pageContent = await page.content();
                            
                            // Extract email from page content
                            const emailMatch = pageContent.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
                            if (emailMatch) {
                                foundEmail = isValidEmail(emailMatch[0]);
                                if (foundEmail) source = 'youtube_page';
                            }

                            await page.close();
                            await context.close();
                        } catch (e) {
                            console.log(`   ℹ️ YouTube page check failed: ${e.message}`);
                        }

                        // 2. Try website if available and no email found
                        if (!foundEmail && website) {
                            try {
                                const context = await browser.newContext();
                                const page = await context.newPage();
                                
                                await page.goto(website, { waitUntil: 'domcontentloaded', timeout: 15000 });
                                const pageContent = await page.content();
                                
                                const emailMatch = pageContent.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
                                if (emailMatch) {
                                    foundEmail = isValidEmail(emailMatch[0]);
                                    if (foundEmail) source = 'website';
                                }

                                await page.close();
                                await context.close();
                            } catch (e) {
                                console.log(`   ℹ️ Website check failed: ${e.message}`);
                            }
                        }

                        // Store result for batch update
                        if (foundEmail) {
                            console.log(`   ✅ Email found: ${foundEmail} (source: ${source})`);
                            batchUpdates.push({ id, email: foundEmail, source });
                            batchFoundCount++;
                            totalFound++;
                        } else {
                            console.log(`   ❌ No email found`);
                            batchUpdates.push({ id, email: 'NOT_FOUND', source: 'not_found' });
                        }

                    } catch (error) {
                        console.error(`   ❌ Error: ${error.message}`);
                        batchUpdates.push({ id, email: 'NOT_FOUND', source: 'error' });
                    }

                    // Delay between requests
                    if (i < channels.length - 1) {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                // Close browser after batch processing
                if (browser) {
                    await browser.close();
                    console.log(`\n🔒 Browser closed\n`);
                }

            } catch (error) {
                console.error(`❌ Browser error: ${error.message}`);
                if (browser) await browser.close().catch(() => { });
                // Even on browser error, try to update what we processed
            }

            // BATCH DATABASE UPDATE (all at once after processing all 50)
            if (batchUpdates.length > 0) {
                console.log(`\n💾 Updating database with ${batchUpdates.length} channel(s)...`);
                try {
                    // Use transaction for atomicity
                    await connection.beginTransaction();

                    for (const update of batchUpdates) {
                        await connection.query(
                            `UPDATE channels SET email = ?, source = ? WHERE id = ?`,
                            [update.email, update.source, update.id]
                        );
                    }

                    await connection.commit();
                    console.log(`✅ Database updated successfully with ${batchUpdates.length} channel(s)`);
                } catch (error) {
                    await connection.rollback();
                    console.error(`❌ Database update failed: ${error.message}`);
                    console.log(`⚠️ Rolling back transaction...`);
                    console.log(`⚠️ Will retry from this batch on next run\n`);
                    continue; // Skip batch summary and retry this batch
                }
            }

            // Batch summary
            console.log(`\n✅ Batch ${batchNumber} processing complete!`);
            console.log(`\n📊 BATCH SUMMARY:`);
            console.log(`   Processed in this batch: ${batchProcessedCount}`);
            console.log(`   ✅ Emails Found in batch: ${batchFoundCount}`);
            console.log(`   Success Rate (batch): ${((batchFoundCount / batchProcessedCount) * 100).toFixed(2)}%`);
            console.log(`\n📊 OVERALL SUMMARY:`);
            console.log(`   Batches completed: ${batchNumber}`);
            console.log(`   Total channels processed: ${totalProcessed}`);
            console.log(`   Total emails found: ${totalFound}`);
            console.log(`   Success Rate (overall): ${((totalFound / totalProcessed) * 100).toFixed(2)}%\n`);
        }

        console.log(`\n🎉 SCRAPER COMPLETED!`);
        console.log(`📊 FINAL SUMMARY:`);
        console.log(`   Total batches: ${batchNumber}`);
        console.log(`   Total channels processed: ${totalProcessed}`);
        console.log(`   Total emails found: ${totalFound}`);

        // Get final counts from DB
        const [finalCount] = await connection.query(`SELECT COUNT(*) as count FROM channels WHERE email IS NOT NULL AND email != 'NOT_FOUND'`);
        const [notFoundCount] = await connection.query(`SELECT COUNT(*) as count FROM channels WHERE email = 'NOT_FOUND'`);
        const [stillNull] = await connection.query(`SELECT COUNT(*) as count FROM channels WHERE email IS NULL`);

        console.log(`\n📊 DATABASE FINAL COUNT:`);
        console.log(`   Channels with email: ${finalCount[0].count}`);
        console.log(`   Channels marked as NOT_FOUND: ${notFoundCount[0].count}`);
        console.log(`   Channels still with NULL email: ${stillNull[0].count}\n`);

        connection.release();
        await pool.end();

    } catch (error) {
        console.error(`❌ Fatal error: ${error.message}`);
    }
};

// Run the scraper
runScraper();
