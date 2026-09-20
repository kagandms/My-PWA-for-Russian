(function exposeCapabilityDetector(root) {
    function resolveWindow(environment) {
        return environment?.window ?? root;
    }

    function resolveNavigator(environment, browserWindow) {
        return environment?.navigator ?? browserWindow?.navigator ?? {};
    }

    function hasSpeechRecognition(browserWindow) {
        return typeof browserWindow?.SpeechRecognition === 'function'
            || typeof browserWindow?.webkitSpeechRecognition === 'function';
    }

    function supportsLocalProcessing(browserWindow) {
        const Constructor = browserWindow?.SpeechRecognition ?? browserWindow?.webkitSpeechRecognition;
        const prototype = Constructor?.prototype;
        return Boolean(prototype && 'processLocally' in prototype);
    }

    function detect(environment = {}) {
        const browserWindow = resolveWindow(environment);
        const browserNavigator = resolveNavigator(environment, browserWindow);
        const secureContext = typeof browserWindow?.isSecureContext === 'boolean'
            ? browserWindow.isSecureContext
            : 'unknown';

        return Object.freeze({
            speech_recognition_api: hasSpeechRecognition(browserWindow) ? 'supported' : 'unsupported',
            media_recorder_api: typeof browserWindow?.MediaRecorder === 'function'
                ? 'supported'
                : 'unsupported',
            microphone_capture: 'untested',
            local_processing_control: supportsLocalProcessing(browserWindow)
                ? 'supported'
                : 'unsupported',
            ru_local_availability: 'unknown',
            stt_runtime: 'not_attempted',
            processing_mode: 'browser_managed_unspecified',
            secure_context: secureContext,
            microphone_api: typeof browserNavigator?.mediaDevices?.getUserMedia === 'function'
                ? 'supported'
                : 'unsupported'
        });
    }

    root.CapabilityDetector = Object.freeze({ detect });
})(typeof window !== 'undefined' ? window : globalThis);

