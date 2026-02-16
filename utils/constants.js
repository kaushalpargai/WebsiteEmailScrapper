// specific constants for the scraper
const BATCH_SIZE = 50;
const WAIT_INTERVAL = 5 * 60 * 1000; // 5 minutes

// File extensions to exclude from email matching
const FILE_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.zip', '.rar',
    '.mp3', '.mp4', '.avi', '.mov', '.exe', '.dll', '.iso', '.dmg', '.apk'
];

// Domains to exclude from being considered valid websites
const EXCLUDED_DOMAINS = [
    'youtube.com', 'youtu.be', 'facebook.com', 'twitter.com', 'x.com', 'kick.com',
    'instagram.com', 'tiktok.com', 'discord.gg', 'twitch.tv', 'reddit.com',
    'linkedin.com', 'pinterest.com', 'google.com', 'bit.ly', 'tinyurl.com'
];

// Selectors to find contact pages
const CONTACT_SELECTORS = [
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

// Priority patterns for email matching in HTML
const PRIORITY_PATTERNS = [
    'support@', 'contact@', 'info@', 'hello@', 'team@', 'business@', 'inquiry@'
];

// Source strings for consistency
const SOURCES = {
    YOUTUBE_PAGE: 'youtube_page',
    WEBSITE: 'website',
    WEBSITE_MAIN: 'website_main',
    WEBSITE_CONTACT: 'website_contact',
    WEBSITE_MAILTO: 'website_mailto',
    WEBSITE_HTML: 'website_html',
    NOT_FOUND: 'NOT_FOUND',
    ERROR: 'error',
    BROWSER_ERROR: 'browser_error'
};

module.exports = {
    BATCH_SIZE,
    WAIT_INTERVAL,
    FILE_EXTENSIONS,
    EXCLUDED_DOMAINS,
    CONTACT_SELECTORS,
    PRIORITY_PATTERNS,
    SOURCES
};
