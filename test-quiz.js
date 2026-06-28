import fs from 'fs';
global.window = global;

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
    
    shuffleArray(array) {
        return array;
    }
}
window.app = new App();

// Load study selector
eval(fs.readFileSync('js/study-selector.js', 'utf8'));
window.studySelector = new StudySelector();

// Load quiz
eval(fs.readFileSync('js/quiz.js', 'utf8'));

const q = new QuizMode();
try {
    q.sessionOptions = { scope: 'learning', customWordList: [{id: 10}, {id: 20}] };
    const words = q.getSessionWords(10);
    console.log("Words length:", words.length);
} catch (e) {
    console.error("ERROR:", e);
}
