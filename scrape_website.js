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
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const {
    BATCH_SIZE,
    WAIT_INTERVAL,
    CONCURRENCY_LIMIT,
    RESOURCE_EXCLUSIONS,
    FILE_EXTENSIONS,
    EXCLUDED_DOMAINS,
    CONTACT_SELECTORS,
    PRIORITY_PATTERNS,
    SOURCES
} = require('./utils/constants');

// --- EMAIL VALIDATION ---
const isValidEmail = (text) => {
    if (!text) return null;
    const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g);
    if (!matches) return null;

    // File extensions to exclude
    // File extensions to exclude
    // const fileExtensions = FILE_EXTENSIONS; // Already imported

    const foundEmail = matches.find(e => {
        const lowerEmail = e.toLowerCase();
        return !lowerEmail.includes('example') &&
            !lowerEmail.includes('sentry') &&
            !lowerEmail.includes('wix') &&
            !lowerEmail.includes('noreply') &&
            !lowerEmail.includes('no-reply') &&
            !FILE_EXTENSIONS.some(ext => lowerEmail.includes(ext));
    });

    if (foundEmail) {
        // Remove 'mail_' or 'mail-' prefix (case insensitive)
        return foundEmail.replace(/^mail[_-]+/i, '');
    }

    return null;
};

const isValidWebsite = (url) => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname || '';

        // Exclude social media and YouTube
        // Exclude social media and YouTube
        // const excludedDomains = EXCLUDED_DOMAINS; // Already imported

        return !EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded));
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
                // Filter out social media and YouTube
                if (!href || !href.startsWith('http') || EXCLUDED_DOMAINS.some(domain => href.includes(domain))) {
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

        // OPTIMIZATION: Block heavy resources
        await page.route('**/*', (route) => {
            return RESOURCE_EXCLUSIONS.includes(route.request().resourceType())
                ? route.abort()
                : route.continue();
        });

        try {
            await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log(`      Website timeout/error: ${e.message}`);
            return { email: null, foundVia: null, website: websiteUrl };
        }
        await page.waitForTimeout(1000); // Reduced from 2500

        // METHOD 1: Main page
        try {
            const bodyText = await page.innerText('body').catch(() => '');
            let email = isValidEmail(bodyText);
            if (email) return { email, foundVia: SOURCES.WEBSITE_MAIN, website: websiteUrl };
        } catch (e) { }

        // METHOD 2: Contact pages
        try {
            for (const selector of CONTACT_SELECTORS) {
                try {
                    const links = await page.locator(selector).all();
                    for (let i = 0; i < Math.min(links.length, 2); i++) {
                        let href = await links[i].getAttribute('href').catch(() => null);
                        if (!href) continue;

                        let fullUrl = href;
                        if (href.startsWith('/')) {
                            // fullUrl = new URL(websiteUrl).origin + href;
                            // Use safer URL construction
                            try {
                                fullUrl = new URL(href, websiteUrl).href;
                            } catch (e) { continue; }
                        } else if (!href.startsWith('http')) {
                            continue;
                        }

                        // Just check first contact page found
                        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { });
                        await page.waitForTimeout(2000);
                        const contactText = await page.innerText('body').catch(() => '');
                        const email = isValidEmail(contactText);
                        if (email) return { email, foundVia: SOURCES.WEBSITE_CONTACT, website: websiteUrl };
                    }
                } catch (e) { }
            }
        } catch (e) { }

        // METHOD 3: Mailto
        try {
            const mailto = await page.getAttribute('a[href^="mailto:"]', 'href').catch(() => null);
            if (mailto) {
                const email = isValidEmail(mailto);
                if (email) return { email, foundVia: SOURCES.WEBSITE_MAILTO, website: websiteUrl };
            }
        } catch (e) { }

        // METHOD 4: Full HTML scan
        try {
            const htmlContent = await page.content().catch(() => '');
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/g;
            const matches = htmlContent.match(emailRegex) || [];

            const priorityPatterns = PRIORITY_PATTERNS; // Already imported? Yes.
            for (const pattern of priorityPatterns) {
                const match = matches.find(e => e.toLowerCase().includes(pattern));
                if (match) {
                    const email = isValidEmail(match);
                    if (email) return { email, foundVia: SOURCES.WEBSITE_HTML, website: websiteUrl };
                }
            }

            if (matches.length > 0) {
                const email = isValidEmail(matches[0]);
                if (email) return { email, foundVia: SOURCES.WEBSITE_HTML, website: websiteUrl };
            }
        } catch (e) { }

        return { email: null, foundVia: null, website: websiteUrl };

    } catch (error) {
        return { email: null, foundVia: null, website: websiteUrl, error: error.message };
    } finally {
        if (page) await page.close().catch(() => { });
    }
};

// --- CHANNEL PROCESSING ---
const processChannel = async (channel, browser) => {
    const { id, channel_id, channel_name, website } = channel;
    const result = { id: id, email: null, source: null };

    try {
        console.log(`Processing: ${channel_name} (ID: ${id})`);

        let foundEmail = null;
        let source = null;
        let extractedWebsite = null;
        let usedWebsite = null;

        // 1. Try YouTube channel page
        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                locale: 'en-US',
                extraHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
            });
            const page = await context.newPage();

            // Block resources on YouTube too
            await page.route('**/*', (route) => {
                return RESOURCE_EXCLUSIONS.includes(route.request().resourceType())
                    ? route.abort()
                    : route.continue();
            });

            let youtubeUrl;
            if (channel_id.startsWith('UC')) {
                youtubeUrl = `https://www.youtube.com/channel/${channel_id}/about`;
            } else {
                youtubeUrl = `https://www.youtube.com/@${channel_id}/about`;
            }

            try {
                await page.goto(youtubeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            } catch (e) {
                // Timeout on YouTube often means slow loading but content might be there partially
            }

            // Consent popup (fast check)
            try {
                const consentButton = page.locator('button[aria-label="Accept all"], button:has-text("Accept all"), button:has-text("Reject all")').first();
                if (await consentButton.isVisible({ timeout: 1000 })) {
                    await consentButton.click();
                    await page.waitForTimeout(500);
                }
            } catch (e) { }

            await page.waitForTimeout(1500); // Reduced from 2000

            const pageContent = await page.content().catch(() => '');
            const emailMatch = pageContent.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
                foundEmail = isValidEmail(emailMatch[0]);
                if (foundEmail) source = SOURCES.YOUTUBE_PAGE;
            }

            if (!foundEmail) {
                const websites = await extractWebsites(page);
                if (websites.length > 0) extractedWebsite = websites[0];
            }

            await page.close().catch(() => { });
            await context.close().catch(() => { });
        } catch (e) {
            // console.log(`   ℹ️ YouTube page check failed: ${e.message}`);
        }

        // 2. Try website if available and no email found
        const targetWebsite = website || extractedWebsite;
        if (!foundEmail && targetWebsite) {
            usedWebsite = targetWebsite;
            console.log(`   🌐 Checking website: ${targetWebsite} ...`);

            // Use the optimized scrapeWebsiteForEmail function
            const scrapeResult = await scrapeWebsiteForEmail(browser, targetWebsite);

            if (scrapeResult.email) {
                foundEmail = scrapeResult.email;
                source = scrapeResult.foundVia || SOURCES.WEBSITE;
            }
        } else if (!foundEmail && !targetWebsite) {
            // console.log(`   ❌ No website found on YouTube channel.`);
        }

        if (foundEmail) {
            console.log(`   ✅ Email found for ${channel_name}: ${foundEmail} (source: ${source})`);
            result.email = foundEmail;
            result.source = source;
        } else {
            console.log(`   ❌ No email found for ${channel_name}`);
        }

        return result;

    } catch (error) {
        console.error(`   ❌ Error processing ${channel_name}: ${error.message}`);
        // Return error status so we can update DB if needed, or just log
        return { id: id, email: SOURCES.NOT_FOUND, source: SOURCES.ERROR };
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
            `SELECT id FROM channels WHERE source IS NOT NULL ORDER BY id DESC LIMIT 1`
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
// --- MAIN SCRAPER ---
(async () => {
    let browser;
    let batchNumber = 0;
    let totalProcessed = 0;
    let totalFound = 0;
    let currentId = 0;

    // Create connection pool (Long-lived)
    const pool = await mysql.createPool(DB_CONFIG);

    try {
        console.log(`🚀 Database Email Scraper Started (DB-Only Mode - 50 channels per batch)\n`);

        // 1. Initial Setup (Short-lived connection)
        {
            console.log(`🗄️ Connecting to MySQL database for setup...`);
            const connection = await pool.getConnection();
            try {
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

                currentId = await getStartingId(connection);
            } finally {
                connection.release();
            }
        }

        let batchContinue = true;

        while (batchContinue) {
            let connection; // Connection for this specific batch
            try {
                // Get a FRESH connection for this batch
                connection = await pool.getConnection();

                batchNumber++;
                const batchStartTime = Date.now();

                // Fetch next 50 channels > currentId
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
                    try {
                        const [totalCount] = await connection.query(`SELECT COUNT(*) as count FROM channels`);
                        const [foundCount] = await connection.query(`SELECT COUNT(*) as count FROM channels WHERE email IS NOT NULL AND email != 'NOT_FOUND'`);

                        console.log(`   Total channels in DB: ${totalCount[0].count}`);
                        console.log(`   Channels with email: ${foundCount[0].count}`);
                        console.log(`   Channels remaining: ${totalCount[0].count - foundCount[0].count}\n`);
                    } catch (e) { console.log(`   ⚠️ Could not fetch counts: ${e.message}`); }

                    console.log(`🔄 Waiting ${WAIT_INTERVAL / 1000 / 60} minutes before checking again...\n`);

                    // Release connection BEFORE waiting
                    connection.release();
                    connection = null;

                    await new Promise(r => setTimeout(r, WAIT_INTERVAL));
                    continue; // Start next iteration (gets new connection)
                }

                // Process channels (Browser logic is independent of DB connection)
                console.log(`🔄 Launching Chromium browser for batch...`);
                const batchUpdates = [];
                let batchProcessedCount = 0;
                let batchFoundCount = 0;
                let batchBrowserError = false;

                try {
                    try {
                        browser = await chromium.launch({
                            headless: true,
                            slowMo: 50,
                            args: [
                                '--disable-blink-features=AutomationControlled',
                                '--no-sandbox',
                                '--disable-setuid-sandbox'
                            ]
                        });
                        console.log(`✅ Browser launched\n`);
                    } catch (error) {
                        console.error(`❌ Browser launch error: ${error.message}`);
                        batchBrowserError = true;
                    }

                    if (batchBrowserError) {
                        for (const channel of channels) {
                            batchUpdates.push({ id: channel.id, email: SOURCES.NOT_FOUND, source: SOURCES.BROWSER_ERROR });
                        }
                    } else {
                        // Concurrent processing of chunks
                        for (let i = 0; i < channels.length; i += CONCURRENCY_LIMIT) {
                            const chunk = channels.slice(i, i + CONCURRENCY_LIMIT);
                            console.log(`\n🔄 Processing chunk ${Math.floor(i / CONCURRENCY_LIMIT) + 1} of ${Math.ceil(channels.length / CONCURRENCY_LIMIT)} (${chunk.length} channels)...`);

                            const promises = chunk.map(channel => processChannel(channel, browser));
                            const results = await Promise.all(promises);

                            for (const res of results) {
                                batchProcessedCount++;
                                totalProcessed++;
                                if (res.source === SOURCES.ERROR) {
                                    batchUpdates.push(res);
                                } else if (res.email) {
                                    batchUpdates.push(res);
                                    batchFoundCount++;
                                    totalFound++;
                                }
                            }

                            if (i + CONCURRENCY_LIMIT < channels.length) {
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        }
                    }

                    if (browser) {
                        await browser.close();
                        console.log(`\n🔒 Browser closed\n`);
                    }
                } catch (error) {
                    console.error(`❌ Browser error: ${error.message}`);
                    if (browser) await browser.close().catch(() => { });
                }

                // Database Update
                if (batchUpdates.length > 0) {
                    console.log(`\n💾 Updating database with ${batchUpdates.length} channel(s)...`);
                    try {
                        await connection.beginTransaction();
                        for (const update of batchUpdates) {
                            await connection.query(
                                `UPDATE channels SET email = ?, source = ? WHERE id = ?`,
                                [update.email, update.source, update.id]
                            );
                        }
                        await connection.commit();
                        console.log(`✅ Database updated successfully`);
                    } catch (error) {
                        await connection.rollback();
                        console.error(`❌ Database update failed: ${error.message}`);
                    }
                }

                // Update checkpoint logic
                if (channels.length > 0) {
                    const lastChannel = channels[channels.length - 1];
                    currentId = lastChannel.id;
                    saveCheckpoint(currentId);
                    console.log(`📍 Checkpoint updated to ID: ${currentId}`);
                }

                // Summary
                const batchEndTime = Date.now();
                const batchDuration = ((batchEndTime - batchStartTime) / 1000).toFixed(2);
                const batchDurationMinutes = (batchDuration / 60).toFixed(2);

                console.log(`\n✅ Batch ${batchNumber} processing complete!`);
                console.log(`   Processed in this batch: ${batchProcessedCount}`);
                console.log(`   ✅ Emails Found in batch: ${batchFoundCount}`);
                console.log(`   ⏱️ Time taken: ${batchDurationMinutes} minutes (${batchDuration} seconds)`);

            } catch (error) {
                console.error(`❌ Batch error: ${error.message}`);
                // If it's a fatal DB error, maybe we pause? 
                await new Promise(r => setTimeout(r, 5000));
            } finally {
                // IMPORTANT: Release connection at end of batch
                if (connection) {
                    connection.release();
                }
            }
        }

    } catch (error) {
        console.error(`❌ Fatal startup error: ${error.message}`);
    } finally {
        if (browser) await browser.close().catch(() => { });
        await pool.end();
    }
})();
