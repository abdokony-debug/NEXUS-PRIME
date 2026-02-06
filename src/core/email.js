const nodemailer = require('nodemailer');
const imaps = require('imap-simple');

class EmailManager {
    constructor() {
        this.tempEmailServices = {
            'guerrilla': 'https://www.guerrillamail.com',
            'tempmail': 'https://temp-mail.org',
            '10minutemail': 'https://10minutemail.com'
        };
        
        this.domains = [
            '@guerrillamail.com',
            '@temp-mail.org',
            '@10minutemail.com'
        ];
    }

    async createTempEmail() {
        // إنشاء بريد مؤقت من خدمة متاحة
        const service = this.selectBestService();
        
        switch(service) {
            case 'guerrilla':
                return await this.createGuerrillaEmail();
            case 'tempmail':
                return await this.createTempMailEmail();
            default:
                return await this.create10MinuteEmail();
        }
    }

    async createGuerrillaEmail() {
        // استخدام Guerrilla Mail API
        const response = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address');
        const data = await response.json();
        
        return {
            email: data.email_addr,
            token: data.sid_token,
            expires: Date.now() + 3600000 // ساعة واحدة
        };
    }

    async checkForVerification(email) {
        // التحقق من البريد للعثور على رابط التحقق
        const service = this.detectService(email);
        
        if (service === 'guerrilla') {
            return await this.checkGuerrillaInbox(email);
        }
        
        // التحقق العام عبر IMAP
        return await this.checkIMAP(email);
    }

    async checkIMAP(email) {
        const config = {
            imap: {
                user: email,
                password: 'temp-password',
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                authTimeout: 10000
            }
        };

        try {
            const connection = await imaps.connect(config);
            await connection.openBox('INBOX');
            
            const searchCriteria = ['UNSEEN', ['SUBJECT', 'verify']];
            const fetchOptions = { bodies: ['HEADER', 'TEXT'] };
            
            const messages = await connection.search(searchCriteria, fetchOptions);
            
            for (const message of messages) {
                const text = message.parts.find(part => part.which === 'TEXT').body;
                const verificationLink = this.extractVerificationLink(text);
                
                if (verificationLink) {
                    await connection.end();
                    return verificationLink;
                }
            }
            
            await connection.end();
            return null;
            
        } catch (error) {
            console.error('IMAP check failed:', error);
            return null;
        }
    }

    extractVerificationLink(text) {
        // استخراج روابط التحقق من نص البريد
        const urlRegex = /(https?:\/\/[^\s]*(verify|confirm|activation)[^\s]*)/gi;
        const matches = text.match(urlRegex);
        return matches ? matches[0] : null;
    }

    detectService(email) {
        for (const [service, domain] of Object.entries(this.tempEmailServices)) {
            if (email.includes(domain)) return service;
        }
        return 'unknown';
    }

    selectBestService() {
        // اختيار أفضل خدمة بناءً على التوفر والتاريخ
        // يمكن إضافة منطق أكثر تعقيداً هنا
        return 'guerrilla';
    }
}

module.exports = EmailManager;
