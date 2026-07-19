import { Redis } from '@upstash/redis';

// CORS headers for allowing frontend access
function setCorsHeaders(req, res) {
    const allowedOrigins = ['https://moyslovar.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Basit güvenlik kontrolü: İstekte gönderilen şifrenin çevresel değişkendeki ile aynı olması
    // Eğer env değişkeni tanımlanmamışsa güvenlik kapalı sayılır (kullanıcı sadece kendisi için yaptığı için).
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.SYNC_SECRET || 'kagan_gizli_sifre_123';
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: 'Yetkisiz erişim.' });
    }

    const redis = Redis.fromEnv();
    const redisKey = 'ru_tr_kagan_sync_data';

    if (req.method === 'GET') {
        try {
            const data = await redis.get(redisKey);
            if (!data) {
                return res.status(404).json({ error: 'Henüz senkronize edilmiş veri yok.' });
            }
            return res.status(200).json(data);
        } catch (error) {
            console.error('Redis GET Error:', error);
            return res.status(500).json({ error: 'Veri alınırken hata oluştu.' });
        }
    } 
    
    if (req.method === 'POST') {
        try {
            const payload = req.body;
            
            if (!payload || !payload.data || !payload.exportedAt) {
                return res.status(400).json({ error: 'Geçersiz veri formatı.' });
            }

            // Veriyi Redis'e yaz (String olarak kaydetmeye gerek yok, @upstash/redis otomatik JSON stringify yapar nesne verirsek)
            await redis.set(redisKey, payload);
            
            return res.status(200).json({ success: true, message: 'Veri başarıyla buluta kaydedildi.' });
        } catch (error) {
            console.error('Redis POST Error:', error);
            return res.status(500).json({ error: 'Veri kaydedilirken hata oluştu.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
