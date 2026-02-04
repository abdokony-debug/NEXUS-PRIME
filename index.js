// Replace the data fetching part in index.js with this:
try {
    const response = await axios.get(process.env.SHEET_URL, { timeout: 30000 });
    if (!response.data || response.data.length < 5) {
        throw new Error("EMPTY_DATA_OR_ACCESS_DENIED");
    }
    const tasks = response.data.split('\n').slice(1).filter(line => line.trim() !== '');
    console.log(`[SYSTEM] Targets Identified: ${tasks.length}`);
    // ... rest of the code
} catch (e) {
    logger.write(`[CRITICAL] Data Access Failed: Check Secret URL and Permissions\n`);
    process.exit(1); // Forces GitHub to show a RED fail instead of a fake green success
}
