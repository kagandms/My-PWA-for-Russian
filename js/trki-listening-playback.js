(function exposeTrkiListeningPlayback(root) {
    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function createInitialState(policy) {
        return {
            status: 'ready',
            logical_play_id: null,
            pending_play_id: null,
            plays_consumed: 0,
            max_plays: policy.max_plays,
            pause_allowed: false,
            seek_allowed: false,
            autoplay: false,
            actual_start_seen: false
        };
    }

    function create(policy) {
        if (!Number.isInteger(policy?.max_plays) || policy.max_plays < 1) throw new Error('Listening max_plays is required.');
        const state = createInitialState(policy);
        let playSequence = 0;

        function getSnapshot() {
            return cloneValue(state);
        }

        function requestPlay() {
            if (state.status === 'cleaned_up') return getSnapshot();
            if (state.plays_consumed >= state.max_plays) {
                state.status = 'max_plays_reached';
                return getSnapshot();
            }
            if (state.pending_play_id || state.status === 'playing' || state.status === 'buffering') return getSnapshot();
            playSequence += 1;
            state.pending_play_id = `logical-play:${playSequence}`;
            state.logical_play_id = state.pending_play_id;
            state.status = 'play_requested';
            state.actual_start_seen = false;
            return getSnapshot();
        }

        function handlePlaying() {
            if (state.status === 'cleaned_up' || !state.pending_play_id) return getSnapshot();
            state.plays_consumed += 1;
            state.pending_play_id = null;
            state.actual_start_seen = true;
            state.status = 'playing';
            return getSnapshot();
        }

        function handleBuffering() {
            if (state.status === 'playing') state.status = 'buffering';
            return getSnapshot();
        }

        function handleEnded() {
            if (state.status === 'playing' || state.status === 'buffering') state.status = 'ready';
            state.logical_play_id = null;
            state.actual_start_seen = false;
            return getSnapshot();
        }

        function handleFailure(details = {}) {
            if (details.before_start === true && state.status === 'play_requested') {
                state.status = 'ready';
                state.pending_play_id = null;
                state.logical_play_id = null;
                state.actual_start_seen = false;
                return getSnapshot();
            }
            if (state.status === 'playing' || state.status === 'buffering') state.status = 'interrupted';
            state.pending_play_id = null;
            return getSnapshot();
        }

        function cleanup() {
            state.status = 'cleaned_up';
            state.pending_play_id = null;
            state.logical_play_id = null;
            state.actual_start_seen = false;
            return getSnapshot();
        }

        return Object.freeze({ requestPlay, handlePlaying, handleBuffering, handleEnded, handleFailure, cleanup, getSnapshot });
    }

    root.ListeningPlayback = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
