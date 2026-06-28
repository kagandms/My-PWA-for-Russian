const appCode = `
class App {
    normalizeSessionOptions(options = {}) {
        return {
            scope: options.scope || 'learning',
            customWordList: options.customWordList || null
        };
    }
    
    getStudyPool(options = {}) {
        const sessionOptions = this.normalizeSessionOptions(options);

        if (sessionOptions.customWordList && Array.isArray(sessionOptions.customWordList)) {
            return [...sessionOptions.customWordList];
        }

        return [{id:1}];
    }
}
const app = new App();
const pool = app.getStudyPool({ scope: 'learning', customWordList: [{id: 10}] });
console.log(pool);
`;
eval(appCode);
