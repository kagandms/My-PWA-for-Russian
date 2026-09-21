(function exposeTrkiListeningCore(root) {
    const LEVELS = new Set(['B1', 'B2']);
    const STORAGE_MODES = new Set(['bundled_synthetic', 'local_restricted']);
    const SOURCE_POLICIES = new Set([
        'synthetic-not-official',
        'official-trki-system-metadata-only',
        'institutional-testing-metadata-only',
        'user-originated-local'
    ]);

    function cloneValue(value) {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    function isRecord(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function requireString(value, fieldName) {
        if (typeof value !== 'string' || !value.trim()) throw new Error(`${fieldName} is required.`);
    }

    function requireHash(value, fieldName) {
        requireString(value, fieldName);
        if (!/^sha256:[a-z0-9][a-z0-9:-]*$/iu.test(value)) throw new Error(`${fieldName} must be a sha256 reference.`);
    }

    function createIdentity(parts) {
        const names = ['package_id', 'package_version', 'task_id', 'audio_id', 'question_id'];
        names.forEach((name) => requireString(parts?.[name], name));
        const copiedParts = names.reduce((result, name) => ({ ...result, [name]: parts[name] }), {});
        return {
            parts: copiedParts,
            key: `${copiedParts.package_id}@${copiedParts.package_version}/${copiedParts.task_id}/${copiedParts.audio_id}/${copiedParts.question_id}`
        };
    }

    function validateSource(source) {
        const fields = [
            'source_id', 'document_id', 'version', 'source_type', 'source_class',
            'content_policy', 'license', 'redistribution_status', 'provenance_status'
        ];
        fields.forEach((field) => requireString(source?.[field], `source.${field}`));
        if (!SOURCE_POLICIES.has(source.content_policy)) throw new Error('source.content_policy is unsupported.');
        if (typeof source.official_trki_provenance !== 'boolean') throw new Error('source.official_trki_provenance is required.');
        if (typeof source.full_content_bundled !== 'boolean') throw new Error('source.full_content_bundled is required.');
        return cloneValue(source);
    }

    function validateAudio(audio) {
        requireString(audio?.audio_id, 'audio.audio_id');
        requireHash(audio?.audio_hash, 'audio.audio_hash');
        requireString(audio?.mime_type, 'audio.mime_type');
        if (!Number.isFinite(audio?.duration_ms) || audio.duration_ms <= 0) throw new Error('audio.duration_ms is required.');
        if (!STORAGE_MODES.has(audio.storage_mode)) throw new Error('audio.storage_mode is unsupported.');
        return cloneValue(audio);
    }

    function validateReplayPolicy(policy) {
        if (!Number.isInteger(policy?.max_plays) || policy.max_plays < 1) throw new Error('replay_policy.max_plays is required.');
        if (policy.autoplay !== false || policy.pause_allowed !== false || policy.seek_allowed !== false) {
            throw new Error('Exam Listening replay policy must disable autoplay, pause, and seek.');
        }
        return cloneValue(policy);
    }

    function validateQuestion(question, task, packageRecord) {
        requireString(question?.question_id, 'question.question_id');
        requireString(question?.prompt, 'question.prompt');
        if (!Array.isArray(question.options) || question.options.length < 2) throw new Error('question.options are required.');
        if (!Number.isInteger(question.answer_key?.option_index)) throw new Error('question.answer_key.option_index is required.');
        if (question.answer_key.option_index >= question.options.length) throw new Error('question.answer_key.option_index is out of range.');
        requireHash(question.question_hash, 'question.question_hash');
        requireHash(question.answer_key_hash, 'question.answer_key_hash');
        requireHash(question.alignment_hash, 'question.alignment_hash');
        if (!Number.isInteger(question.numbering?.section_number) || !Number.isInteger(question.numbering?.item_number)) {
            throw new Error('question.numbering is required.');
        }
        if (question.alignment?.audio_id !== task?.audio?.audio_id) throw new Error('question.alignment audio identity mismatch.');
        if (!['candidate', 'verified', 'rejected', 'needs_review'].includes(question.verification_status)) {
            throw new Error('question.verification_status is unsupported.');
        }
        if (typeof question.exercise_eligible !== 'boolean') throw new Error('question.exercise_eligible is required.');
        createIdentity({ package_id: packageRecord?.package_id, package_version: packageRecord?.package_version, task_id: task?.task_id, audio_id: task?.audio?.audio_id, question_id: question.question_id });
        return cloneValue(question);
    }

    function validateTask(task, packageRecord) {
        requireString(task?.task_id, 'task.task_id');
        requireString(task?.task_type, 'task.task_type');
        requireHash(task.task_hash, 'task.task_hash');
        validateAudio(task.audio);
        requireHash(task.replay_policy_hash, 'task.replay_policy_hash');
        validateReplayPolicy(task.replay_policy);
        if (task.transcript !== null && typeof task.transcript !== 'string') throw new Error('task.transcript must be a string or null.');
        requireHash(task.transcript_hash, 'task.transcript_hash');
        if (!Array.isArray(task.questions) || task.questions.length === 0) throw new Error('task.questions are required.');
        task.questions.forEach((question) => validateQuestion(question, task, packageRecord));
        return cloneValue(task);
    }

    function validatePackage(packageRecord) {
        requireString(packageRecord?.package_id, 'package_id');
        requireString(packageRecord?.package_version, 'package_version');
        requireHash(packageRecord.package_hash, 'package_hash');
        if (!LEVELS.has(packageRecord.level)) throw new Error('package.level is unsupported.');
        validateSource(packageRecord.source);
        if (!Array.isArray(packageRecord.tasks) || packageRecord.tasks.length === 0) throw new Error('package.tasks are required.');
        const identities = new Set();
        packageRecord.tasks.forEach((task) => {
            validateTask(task, packageRecord);
            task.questions.forEach((question) => {
                const identity = createIdentity({
                    package_id: packageRecord.package_id,
                    package_version: packageRecord.package_version,
                    task_id: task.task_id,
                    audio_id: task.audio.audio_id,
                    question_id: question.question_id
                }).key;
                if (identities.has(identity)) throw new Error(`Duplicate Listening question identity: ${identity}`);
                identities.add(identity);
            });
        });
        return cloneValue(packageRecord);
    }

    function isObjectiveEligible(question, context = {}) {
        const packageRecord = context.package;
        const source = packageRecord?.source;
        if (context.sourceVerification !== 'verified' || !source || source.provenance_status !== 'verified') return false;
        if (source.content_policy !== 'synthetic-not-official' && source.content_policy !== 'user-originated-local') return false;
        if (source.official_trki_provenance === true || source.full_content_bundled !== true) return false;
        return question?.verification_status === 'verified' && question.exercise_eligible === true;
    }

    function evaluateAnswer(question, submittedAnswer) {
        const isCorrect = submittedAnswer === question?.answer_key?.option_index;
        return { result: isCorrect ? 'correct' : 'incorrect', score: isCorrect ? 1 : 0 };
    }

    function createEvaluationSnapshot(question, result, context = {}) {
        const packageRecord = context.package;
        const task = context.task;
        const identity = createIdentity({
            package_id: packageRecord?.package_id,
            package_version: packageRecord?.package_version,
            task_id: task?.task_id,
            audio_id: task?.audio?.audio_id,
            question_id: question?.question_id
        });
        return {
            identity,
            package_hash: packageRecord.package_hash,
            task_hash: task.task_hash,
            audio_hash: task.audio.audio_hash,
            question_hash: question.question_hash,
            answer_key_hash: question.answer_key_hash,
            alignment_hash: question.alignment_hash,
            replay_policy_hash: task.replay_policy_hash,
            transcript_hash: task.transcript_hash,
            answer_key_snapshot: cloneValue(question.answer_key),
            alignment_snapshot: cloneValue(question.alignment),
            replay_policy_snapshot: cloneValue(task.replay_policy),
            verification_status: question.verification_status,
            exercise_eligible: question.exercise_eligible,
            source_reference: cloneValue(packageRecord.source),
            result: result.result,
            score: result.score,
            evaluator_version: 'trki-listening-evaluator-v1'
        };
    }

    root.TrkiListeningCore = Object.freeze({
        createIdentity,
        validatePackage,
        validateQuestion,
        isObjectiveEligible,
        evaluateAnswer,
        createEvaluationSnapshot
    });
})(typeof window !== 'undefined' ? window : globalThis);
