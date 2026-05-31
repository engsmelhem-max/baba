let mediaRecorder;
let audioChunks = [];
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];
if (orders.length > 5) {
    orders = orders.slice(-5);
    localStorage.setItem('myOrders', JSON.stringify(orders));
}
let userLocationUrl = "لم يتم تحديد الموقع"; 
let textRecognitionResult = ""; 
let generatedOTP = ""; // لتخزين الرمز العشوائي الذي تم إنشاؤه

// 📞 رَقْم الواتساب الخاص بكِ (إدارة لقمة):
const WHATSAPP_NUMBER = "962788814488"; 

// 🔗 رابط الـ Web App الفعال الخاص بكِ:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwn8HUbtIBYlc9FU89vUl_yDD7u_T13_fcxpnIILGbpiY_Gqs-EPpZRbnDYqre4J0g/exec"; 

window.onload = function() {
    const savedPhone = localStorage.getItem('savedPhone');
    const savedAddress = localStorage.getItem('savedAddress');
    if (savedPhone) document.getElementById('phone').value = savedPhone;
    if (savedAddress) document.getElementById('address').value = savedAddress;
    
    initAudioPermission();
};

// تحديد صيغة الصوت المناسبة للجهاز المتصفح (مهم جداً للآيفون)
function getSupportedMimeType() {
    const types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav'];
    for (let type of types) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return ''; // لترك المتصفح يختار الصيغة التلقائية المتاحة لديه
}

async function initAudioPermission() {
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = {};
            const mimeType = getSupportedMimeType();
            if (mimeType) options.mimeType = mimeType;

            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = (event) => { 
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data); 
                }
            };
            setupAudioStopListener();
        }
    } catch (err) {
        console.log("بانتظار تفعيل إذن المايكروفون عند التسجيل أو المتصفح لا يدعم التسجيل المباشر.");
    }
}

// إعداد نظام تحويل الصوت لنص ليعمل بدقة في الخلفية
let speechRecognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechConstructor();
    speechRecognition.continuous = true; 
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'ar-JO'; 

    speechRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                textRecognitionResult += event.results[i][0].transcript + ' ';
            }
        }
    };
}

// 🟩 دالة الضغط على "استمرار" - توليد الرمز وفتح الواتساب مجاناً
function goToStep2() {
    const phoneInputEl = document.getElementById('phone');
    const addressInputEl = document.getElementById('address');
    const jordanPhoneRegex = /^07[0-9]{8}$/;

    const phone = phoneInputEl.value.trim();
    const address = addressInputEl.value.trim();

    if (!phone || !address) {
        if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); 
        setTimeout(() => { alert("لطفاً، أدخلي رقم الهاتف والعنوان أولاً لتتمكني من الطلب 💖"); }, 100);
        return;
    }

    if (!jordanPhoneRegex.test(phone)) {
        if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); 
        setTimeout(() => { alert("تنبيه: يجب أن يتكون رقم الهاتف من 10 أرقام بالضبط، وأن يبدأ إجبارياً بـ 07 📱"); }, 100); 
        return;
    }

    if (document.activeElement) document.activeElement.blur();

    // 1️⃣ إنشاء رمز تحقق عشوائي مكون من 4 أرقام
    generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

    // 2️⃣ تجهيز الرسالة التلقائية للواتساب لتأكيد أن الرقم حقيقي وصاحب الهاتف هو من يرسل
    const messageText = `مرحباً لقمة 🌸، أريد تفعيل حسابي وتأكيد رقمي. رمز التحقق الخاص بي هو: ❪ ${generatedOTP} ❫`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;

    // 🎇 3️⃣ الحركة الأنيقة لإظهار خانة الرمز في الموقع
    const otpArea = document.getElementById('otp-area');
    const btnContinue = document.getElementById('btn-continue');
    
    btnContinue.style.display = "none";
    otpArea.style.display = "block";
    setTimeout(() => {
        otpArea.style.opacity = "1";
        otpArea.style.transform = "translateY(0)";
    }, 50);

    // 4️⃣ فتح الواتساب تلقائياً للزبونة لإرسال الرمز وتأكيد هوية المستخدم
    setTimeout(() => {
        window.open(whatsappUrl, '_blank');
    }, 400);
}

// 🔑 دالة التحقق من الرمز المدخل والانتقال لصفحة المايكروفون
function verifyOTPAndProceed() {
    const userEnteredOTP = document.getElementById('otp-code').value.trim();
    
    if (userEnteredOTP === "") {
        alert("لطفاً، أدخلي رمز التحقق أولاً 🌸");
        return;
    }

    // مطابقة الرمز الذي أنشأه الموقع مع ما أدخلته الزبونة
    if (userEnteredOTP !== generatedOTP) {
        alert("رمز التحقق غير صحيح، يرجى التأكد من الرمز المرسل عبر الواتساب الخاص بكِ ❌");
        return;
    }

    // إذا كان الرمز صحيحاً، يتم حفظ البيانات والدخول
    localStorage.setItem('savedPhone', document.getElementById('phone').value.trim());
    localStorage.setItem('savedAddress', document.getElementById('address').value.trim());

    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    
    requestLocation();
}

function setupAudioStopListener() {
    if (!mediaRecorder) return;
    mediaRecorder.onstop = async () => {
        const currentPhone = document.getElementById('phone').value;
        const currentAddress = document.getElementById('address').value;
        const timestamp = new Date().toLocaleString('ar-JO');

        document.getElementById('display-user-phone').innerText = currentPhone;
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step3').classList.add('active');

        // تحديد نوع الامتداد المستخرج ديناميكياً بناءً على ما يدعمه المتصفح
        const currentMimeType = mediaRecorder.mimeType || 'audio/wav';
        const audioBlob = new Blob(audioChunks, { type: currentMimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onloadend = function() {
            const base64Audio = reader.result.split(',')[1];
            setTimeout(() => {
                let finalOrderText = textRecognitionResult.trim();
                if (finalOrderText === "") finalOrderText = "طلب صوتي (يرجى الاستماع للمقطع) 🎙️";
                orders.push({ date: timestamp, text: finalOrderText });
                if (orders.length > 5) orders = orders.slice(-5);
                localStorage.setItem('myOrders', JSON.stringify(orders));
                
                // تحديد الامتداد المناسب لاسم الملف المرفوع لجوجل درايف
                let extension = "wav";
                if(currentMimeType.includes("webm")) extension = "webm";
                else if(currentMimeType.includes("mp4")) extension = "mp4";
                else if(currentMimeType.includes("ogg")) extension = "ogg";

                sendToGoogleDriveInBackground(base64Audio, currentPhone, currentAddress, timestamp, finalOrderText, extension);
            }, 1500);
        };
    };
}

const voiceBtn = document.getElementById('voice-btn');
if (voiceBtn) {
    // أحداث الماوس للكمبيوتر
    voiceBtn.addEventListener('mousedown', startRecording);
    voiceBtn.addEventListener('mouseup', stopRecording);
    
    // أحداث اللمس للموبايل (تم تعديلها لمنع المشاكل وتعطيل القوائم المنبثقة)
    voiceBtn.addEventListener('touchstart', (e) => { 
        if(e.cancelable) e.preventDefault(); 
        startRecording(); 
    }, { passive: false });
    
    voiceBtn.addEventListener('touchend', (e) => { 
        if(e.cancelable) e.preventDefault(); 
        stopRecording(); 
    }, { passive: false });
}

async function startRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = {};
            const mimeType = getSupportedMimeType();
            if (mimeType) options.mimeType = mimeType;

            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = (event) => { 
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data); 
                }
            };
            setupAudioStopListener();
        } catch (err) {
            alert("يرجى منح إذن المايكروفون للتطبيق لتتمكني من تسجيل طلبكِ 🎙️");
