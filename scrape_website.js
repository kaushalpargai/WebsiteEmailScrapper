require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
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
const WAIT_INTERVAL = 5 * 60 * 1000; // 5 minutes

// --- EMAIL VALIDATION ---
const isValidEmail = (text) => {
    if (!text) return null;
    const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g);
    if (!matches) return null;

    // File extensions to exclude
    const fileExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.zip', '.rar', '.mp3', '.mp4', '.avi', '.mov', '.exe', '.dll', '.iso', '.dmg', '.apk'];

    return matches.find(e => {
        const lowerEmail = e.toLowerCase();
        return !lowerEmail.includes('example') &&
            !lowerEmail.includes('sentry') &&
            !lowerEmail.includes('wix') &&
            !lowerEmail.includes('noreply') &&
            !lowerEmail.includes('no-reply') &&
            !fileExtensions.some(ext => lowerEmail.includes(ext));
    }) || null;
};

const isValidWebsite = (url) => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname || '';

        // Exclude social media and YouTube
        const excludedDomains = [
            'youtube.com', 'youtu.be', 'facebook.com', 'twitter.com', 'x.com',
            'instagram.com', 'tiktok.com', 'discord.gg', 'twitch.tv', 'reddit.com',
            'linkedin.com', 'pinterest.com', 'google.com', 'bit.ly', 'tinyurl.com'
        ];

        return !excludedDomains.some(excluded => domain.includes(excluded));
    } catch {
        return false;
    }
};

const extractWebsites = async (page) => {
    try {
        await page.locator('button').first().click().catch(() => { });

        try {
            await page.waitForTimeout(1500);
        } catch (e) { }

        const links = await page.locator('#links-section a, a[href*="http"]').all();
        const websites = new Set();

        for (const link of links) {
            try {
                let href = await link.getAttribute('href').catch(() => '');
                if (!href) continue;

                // Handle YouTube redirect URLs
                try {
                    const url = new URL(href);
                    if (url.hostname === 'www.youtube.com' && url.pathname === '/redirect') {
                        href = url.searchParams.get('q');
                    }
                } catch (e) { }

                // Filter out social media and YouTube
                if (!href ||
                    href.includes('youtube.com') ||
                    href.includes('youtu.be') ||
                    href.includes('facebook.com') ||
                    href.includes('twitter.com') ||
                    href.includes('x.com') ||
                    href.includes('instagram.com') ||
                    href.includes('tiktok.com') ||
                    href.includes('discord.gg') ||
                    href.includes('twitch.tv') ||
                    href.includes('reddit.com') ||
                    href.includes('linkedin.com') ||
                    href.includes('pinterest.com') ||
                    href.includes('google.com') ||
                    href.includes('bit.ly') ||
                    href.includes('tinyurl.com') ||
                    !href.startsWith('http')) {
                    continue;
                }

                if (isValidWebsite(href)) {
                    websites.add(href);
                }
            } catch (e) { }
        }

        return Array.from(websites).slice(0, 5);
    } catch (e) {
        return [];
    }
};

const scrapeWebsiteForEmail = async (browser, websiteUrl, maxRetries = 3) => {
    let page;
    try {
        page = await browser.newPage();

        // Try to access the website
        try {
            await page.goto(websiteUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
        } catch (e) {
            console.log(`      Website timeout/error: ${e.message}`);
            return { email: null, foundVia: null, website: websiteUrl };
        }

        await page.waitForTimeout(2500);

        // METHOD 1: Check main page for emails
        try {
            const bodyText = await page.innerText('body').catch(() => '');
            let email = isValidEmail(bodyText);
            if (email) {
                return { email, foundVia: "website_main", website: websiteUrl };
            }
        } catch (e) { }

        // METHOD 2: Look for and click contact/about/help links
        try {
            const contactSelectors = [
                'a[href*="contact"]',
                'a[href*="about"]',
                'a[href*="help"]',
                'a[href*="support"]',
                'a[href*="reach"]',
                'a:has-text("Contact")',
                'a:has-text("contact")',
                'a:has-text("Contact Us")',
                'a:has-text("Get in Touch")',
            ];

            for (const selector of contactSelectors) {
                try {
                    const links = await page.locator(selector).all();
                    for (let i = 0; i < Math.min(links.length, 2); i++) {
                        try {
                            const href = await links[i].getAttribute('href').catch(() => null);
                            if (!href) continue;

                            // Handle relative URLs
                            let fullUrl = href;
                            if (href.startsWith('/')) {
                                const baseUrl = new URL(websiteUrl);
                                fullUrl = baseUrl.origin + href;
                            }

                            // Navigate to contact page
                            await page.goto(fullUrl, {
                                waitUntil: 'domcontentloaded',
                                timeout: 15000
                            }).catch(() => { });

                            await page.waitForTimeout(2000);

                            // Check contact page for emails
                            const contactText = await page.innerText('body').catch(() => '');
                            const email = isValidEmail(contactText);
                            if (email) {
                                return { email, foundVia: "website_contact", website: websiteUrl };
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
            }
        } catch (e) { }

        // METHOD 3: Check for mailto links
        try {
            const mailtoLinks = await page.locator('a[href^="mailto:"]').all();
            for (const link of mailtoLinks) {
                const href = await link.getAttribute('href').catch(() => '');
                const email = isValidEmail(href);
                if (email) {
                    return { email, foundVia: "website_mailto", website: websiteUrl };
                }
            }
        } catch (e) { }

        // METHOD 4: Go back to main page and do full HTML scan
        try {
            await page.goto(websiteUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            }).catch(() => { });

            const htmlContent = await page.content().catch(() => '');
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;
            const matches = htmlContent.match(emailRegex) || [];

            // Sort by common patterns (support@, contact@, info@, hello@)
            const priorityPatterns = ['support@', 'contact@', 'info@', 'hello@', 'team@', 'business@', 'inquiry@'];
            for (const pattern of priorityPatterns) {
                const match = matches.find(e => e.toLowerCase().includes(pattern));
                if (match) {
                    const email = isValidEmail(match);
                    if (email) {
                        return { email, foundVia: "website_html", website: websiteUrl };
                    }
                }
            }

            // Return first valid email if no priority pattern matched
            if (matches.length > 0) {
                const email = isValidEmail(matches[0]);
                if (email) {
                    return { email, foundVia: "website_html", website: websiteUrl };
                }
            }
        } catch (e) { }

        return { email: null, foundVia: null, website: websiteUrl };

    } catch (error) {
        return { email: null, foundVia: null, website: websiteUrl, error: error.message };
    } finally {
        if (page) await page.close().catch(() => { });
    }
};

// --- CHECKPOINT LOGIC ---
const CHECKPOINT_DIR = process.env.CHECKPOINT_DIR || './';
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, 'checkpoint.json');

const getStartingId = async (connection) => {
    // 1. Check local checkpoint file
    if (fs.existsSync(CHECKPOINT_FILE)) {
        try {
            const data = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
            const checkpoint = JSON.parse(data);
            if (checkpoint.last_processed_id) {
                console.log(`📂 Found checkpoint at ${CHECKPOINT_FILE}. Resuming from ID: ${checkpoint.last_processed_id}`);
                return checkpoint.last_processed_id;
            }
        } catch (e) {
            console.error(`⚠️ Error reading checkpoint file: ${e.message}`);
        }
    } else {
        console.log(`ℹ️ No checkpoint file found at ${CHECKPOINT_FILE}`);
    }

    // 2. Fallback to DB (find last successful website scrape)
    console.log(`⚠️ No local checkpoint found. Checking Database for last 'website' source...`);
    try {
        const [rows] = await connection.query(
            `SELECT id FROM channels WHERE email IS NOT NULL AND source = 'website' ORDER BY id DESC LIMIT 1`
        );

        if (rows.length > 0) {
            console.log(`🔄 Found last processed ID in DB: ${rows[0].id}. Resuming from there.`);
            return rows[0].id;
        }
    } catch (e) {
        console.error(`❌ Error querying DB for checkpoint: ${e.message}`);
    }

    // 3. Default to 0
    console.log(`🆕 No checkpoint or DB history found. Starting from ID 0.`);
    return 0;
};

const saveCheckpoint = (id) => {
    try {
        fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ last_processed_id: id }));
        // console.log(`💾 Checkpoint saved: ID ${id}`);
    } catch (e) {
        console.error(`❌ Error saving checkpoint: ${e.message}`);
    }
};

// --- MAIN SCRAPER ---
(async () => {
    let connection;
    let browser;
    let batchNumber = 0;
    let totalProcessed = 0;
    let totalFound = 0;
    let currentId = 0;

    try {
        console.log(`🚀 Database Email Scraper Started (DB-Only Mode - 50 channels per batch)\n`);
        console.log(`🗄️ Connecting to MySQL database...`);

        // Create connection pool
        const pool = await mysql.createPool(DB_CONFIG);
        connection = await pool.getConnection();
        console.log(`✅ Connected to database: ${DB_CONFIG.database}\n`);

        // Check if source column exists
        console.log(`📋 Checking table structure...`);
        try {
            const [columns] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'channels' AND COLUMN_NAME = 'source'`
            );

            if (columns.length === 0) {
                console.log(`   ➕ Adding 'source' column to channels table...`);
                await connection.query(`ALTER TABLE channels ADD COLUMN source VARCHAR(255) DEFAULT NULL`);
                console.log(`   ✅ Column 'source' added\n`);
            } else {
                console.log(`   ✅ Column 'source' already exists\n`);
            }
        } catch (e) {
            console.log(`   ⚠️ Could not verify column: ${e.message}\n`);
        }

        if (connection) {
            currentId = await getStartingId(connection);
        }

        let batchContinue = true;

        while (batchContinue) {
            batchNumber++;
            const batchStartTime = Date.now();

            // Fetch next 50 channels > currentId
            // We still filter by email IS NULL to optimize, but mostly rely on ID progression
            console.log(`\n📊 Batch ${batchNumber}: Fetching channels > ID ${currentId}...`);
            const [channels] = await connection.query(
                `SELECT * FROM channels WHERE id > ? AND email IS NULL ORDER BY id ASC LIMIT ?`,
                [currentId, BATCH_SIZE]
            );

            console.log(`   Found ${channels.length} channels to process\n`);

            if (channels.length === 0) {
                console.log(`⏸️  No channels with missing emails found.`);
                console.log(`\n📊 CURRENT STATUS:`);
                console.log(`   Batches completed: ${batchNumber - 1}`);
                console.log(`   Total channels processed: ${totalProcessed}`);
                console.log(`   Total emails found: ${totalFound}\n`);

                // Check final counts from DB
                const [totalCount] = await connection.query(`SELECT COUNT(*) as count FROM channels`);
                const [foundCount] = await connection.query(`SELECT COUNT(*) as count FROM channels WHERE email IS NOT NULL AND email != 'NOT_FOUND'`);

                console.log(`   Total channels in DB: ${totalCount[0].count}`);
                console.log(`   Channels with email: ${foundCount[0].count}`);
                console.log(`   Channels remaining: ${totalCount[0].count - foundCount[0].count}\n`);

                console.log(`🔄 Waiting ${WAIT_INTERVAL / 1000 / 60} minutes before checking again...\n`);
                await new Promise(r => setTimeout(r, WAIT_INTERVAL));
                continue; // Check again
            }

            // Process channels
            console.log(`🔄 Launching Chromium browser for batch...`);
            const batchUpdates = [];
            let batchProcessedCount = 0;
            let batchFoundCount = 0;
            let batchBrowserError = false;

            try {
                try {
                    browser = await chromium.launch({
                        headless: true,
                        slowMo: 50
                    });
                    console.log(`✅ Browser launched\n`);
                } catch (error) {
                    console.error(`❌ Browser launch error: ${error.message}`);
                    batchBrowserError = true;
                }

                if (batchBrowserError) {
                    // Skip this batch and mark all as NOT_FOUND due to browser error
                    for (const channel of channels) {
                        batchUpdates.push({ id: channel.id, email: 'NOT_FOUND', source: 'browser_error' });
                    }
                } else {
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
                                // batchUpdates.push({ id, email: 'NOT_FOUND', source: 'not_found' }); // REMOVED per user request
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
                }

                // Close browser after batch processing
                if (browser) {
                    await browser.close();
                    console.log(`\n🔒 Browser closed\n`);
                }

            } catch (error) {
                console.error(`❌ Browser error: ${error.message}`);
                if (browser) await browser.close().catch(() => { });
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

            // Update checkpoint/currentId
            if (channels.length > 0) {
                const lastChannel = channels[channels.length - 1];
                currentId = lastChannel.id;
                saveCheckpoint(currentId);
                console.log(`📍 Checkpoint updated to ID: ${currentId}`);
            }

            // Batch summary
            const batchEndTime = Date.now();
            const batchDuration = ((batchEndTime - batchStartTime) / 1000).toFixed(2); // Duration in seconds
            const batchDurationMinutes = (batchDuration / 60).toFixed(2); // Duration in minutes

            console.log(`\n✅ Batch ${batchNumber} processing complete!`);
            console.log(`\n📊 BATCH SUMMARY:`);
            console.log(`   Processed in this batch: ${batchProcessedCount}`);
            console.log(`   ✅ Emails Found in batch: ${batchFoundCount}`);
            console.log(`   Success Rate (batch): ${((batchFoundCount / batchProcessedCount) * 100).toFixed(2)}%`);
            console.log(`   ⏱️ Time taken: ${batchDurationMinutes} minutes (${batchDuration} seconds)`);
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
        console.log(`\n💾 Progress saved in database. You can resume by running the script again.`);
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
        if (connection) {
            connection.release();
        }
    }
})();
