async function Index({ folderPath, dc }) {
    const { useState, useEffect } = dc;
    const { App } = await dc.require(folderPath + "/src/App.jsx");
    const { ICONS } = await dc.require(folderPath + "/src/data/icons.js");

    const SafeRoot = () => {
        const [reloadKey, setReloadKey] = useState(0);

        // Polling watch daemon for cache invalidation
        useEffect(() => {
            let interval;
            const checkCommand = async () => {
                try {
                    const cmdPath = folderPath + "/data/mcp_commands.json";
                    const stat = await dc.app.vault.adapter.stat(cmdPath);
                    if (stat) {
                        const content = await dc.app.vault.adapter.read(cmdPath);
                        const data = JSON.parse(content);
                        if (data.action === "reload" && !data.executed) {
                            data.executed = true;
                            await dc.app.vault.adapter.write(cmdPath, JSON.stringify(data, null, 2));
                            setReloadKey(prev => prev + 1);
                        }
                    }
                } catch (e) {
                    // Ignore missing file errors
                }
            };
            interval = setInterval(checkCommand, 1000);
            return () => clearInterval(interval);
        }, []);

        return <App key={reloadKey} ICONS={ICONS} folderPath={folderPath} dc={dc} />;
    };

    return <SafeRoot />;
}

return { Index };
