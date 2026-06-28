import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });

const scripts = [
    'js/data.js',
    'js/app.js',
    'js/storage.js',
    'js/quiz.js',
    'js/flashcard.js',
    'js/prefixes-mode.js'
];

let scriptContents = '';
for (const s of scripts) {
    scriptContents += fs.readFileSync(s, 'utf8') + '\n';
}

const window = dom.window;
const document = window.document;

window.WORDS = [{id:1, russian:"test", turkish:"test", category:"Prefiksler"}];

try {
    window.eval(scriptContents);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    
    setTimeout(() => {
        window.app.openMode('prefixes');
        console.log("Prefixes mode hidden:", document.getElementById('prefixesMode').classList.contains('hidden'));
        
        const studyBtn = document.getElementById('prefixesStudyBtn');
        console.log("Study Btn exists:", !!studyBtn);
        if (studyBtn) studyBtn.click();
        
        console.log("Question modal hidden:", document.getElementById('questionCountModal').classList.contains('hidden'));
        
        const countBtn = document.querySelector('#questionCountModal .modal-btn[data-count="10"]');
        if (countBtn) countBtn.click();
        
        console.log("Quiz mode hidden:", document.getElementById('quizMode').classList.contains('hidden'));
    }, 500);
} catch (e) {
    console.error(e);
}
