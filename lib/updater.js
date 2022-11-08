let tempUpdater = null;
export function registerUpdater(updater) {
    tempUpdater = updater;
    const value = updater.collect();
    tempUpdater = null;
    return {
        updater,
        value
    };
}
export function getTempUpdater() {
    return tempUpdater;
}
