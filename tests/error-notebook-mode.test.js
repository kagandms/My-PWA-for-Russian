import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.textContent = '';
        this.dataset = {};
        this.children = [];
        this.onclick = null;
    }

    append(...children) {
        this.children.push(...children);
    }
}

function loadMode(store) {
    const source = fs.readFileSync(path.join(ROOT, 'js/error-notebook-mode.js'), 'utf8');
    const elements = new Map([
        ['errorNotebookSummary', new FakeElement('p')],
        ['errorNotebookList', new FakeElement('div')]
    ]);
    const document = {
        getElementById: id => elements.get(id) || null,
        createElement: tagName => new FakeElement(tagName)
    };
    const window = { errorNotebookStore: store };
    vm.runInNewContext(source, { window, globalThis: window, document, console }, { filename: 'error-notebook-mode.js' });
    return { Mode: window.ErrorNotebookMode, elements };
}

function createError(status = 'active') {
    return {
        error_id: 'error:1',
        error_type: 'recall.mismatch',
        error_subtype: 'unclassified',
        skill: 'recall',
        exercise_type: 'typed_recall',
        verification_status: 'verified',
        detection_method: 'deterministic',
        status,
        created_at: '2026-09-20T10:00:00.000Z',
        evidence: {
            user_answer: 'говорить',
            expected_answers: ['учиться']
        }
    };
}

test('renders Error Notebook detail fields and lifecycle actions for active errors', () => {
    let currentError = createError();
    const lifecycleCalls = [];
    const store = {
        getAggregates: () => ({ total_active: currentError.status === 'active' ? 1 : 0 }),
        getErrors: () => [currentError],
        recordLifecycleUpdate: update => {
            lifecycleCalls.push(update);
            currentError = { ...currentError, status: update.status };
        }
    };
    const { Mode, elements } = loadMode(store);
    const mode = new Mode();

    mode.init();

    const item = elements.get('errorNotebookList').children[0];
    const renderedText = item.children.map(child => child.textContent).join(' ');
    const actions = item.children.filter(child => child.tagName === 'button');

    assert.match(renderedText, /recall\.mismatch/u);
    assert.match(renderedText, /говорить/u);
    assert.match(renderedText, /учиться/u);
    assert.match(renderedText, /2026-09-20T10:00:00\.000Z/u);
    assert.match(renderedText, /verified/u);
    assert.equal(actions.length, 2);

    actions.find(button => button.textContent === 'Resolve').onclick();

    assert.deepEqual(JSON.parse(JSON.stringify(lifecycleCalls)), [{ error_id: 'error:1', status: 'resolved' }]);
    assert.equal(currentError.status, 'resolved');
});
