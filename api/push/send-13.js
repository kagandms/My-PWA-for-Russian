import { handleCronRequest } from '../../lib/push/cron-handler.js';

export default function handler(req, res) {
    return handleCronRequest(req, res, '13:00');
}
