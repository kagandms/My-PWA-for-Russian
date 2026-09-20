import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const ROOT = process.cwd();

function loadCapabilities() {
    const source = fs.readFileSync(path.join(ROOT, 'js/speaking-capabilities.js'), 'utf8');
    const window = {};
    vm.runInNewContext(source, { window, globalThis: window, console }, { filename: 'speaking-capabilities.js' });
    return window.CapabilityDetector;
}

test('detects explicit browser capability dimensions without requesting permission', () => {
    const detector = loadCapabilities();
    let permissionCalls = 0;
    const FakeRecognition = function FakeRecognition() {};
    FakeRecognition.prototype.processLocally = false;
    const capabilities = detector.detect({
        window: {
            isSecureContext: true,
            SpeechRecognition: FakeRecognition,
            MediaRecorder: class MediaRecorder {}
        },
        navigator: {
            mediaDevices: {
                getUserMedia: async () => {
                    permissionCalls += 1;
                    throw new Error('must not be called during detection');
                }
            }
        }
    });

    assert.equal(capabilities.speech_recognition_api, 'supported');
    assert.equal(capabilities.media_recorder_api, 'supported');
    assert.equal(capabilities.microphone_capture, 'untested');
    assert.equal(capabilities.local_processing_control, 'supported');
    assert.equal(capabilities.ru_local_availability, 'unknown');
    assert.equal(capabilities.stt_runtime, 'not_attempted');
    assert.equal(capabilities.processing_mode, 'browser_managed_unspecified');
    assert.equal(capabilities.secure_context, true);
    assert.equal(permissionCalls, 0);
});

test('does not infer processing location from ordinary speech recognition support', () => {
    const detector = loadCapabilities();
    const capabilities = detector.detect({
        window: { SpeechRecognition: class SpeechRecognition {} },
        navigator: {}
    });

    assert.equal(capabilities.processing_mode, 'browser_managed_unspecified');
    assert.equal(capabilities.ru_local_availability, 'unknown');
    assert.notEqual(capabilities.processing_mode, 'local_required');
});

test('reports unsupported APIs and insecure context without false microphone state', () => {
    const detector = loadCapabilities();
    const capabilities = detector.detect({
        window: { isSecureContext: false },
        navigator: {}
    });

    assert.equal(capabilities.speech_recognition_api, 'unsupported');
    assert.equal(capabilities.media_recorder_api, 'unsupported');
    assert.equal(capabilities.microphone_capture, 'untested');
    assert.equal(capabilities.local_processing_control, 'unsupported');
    assert.equal(capabilities.processing_mode, 'browser_managed_unspecified');
    assert.equal(capabilities.secure_context, false);
});

