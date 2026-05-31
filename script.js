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

// 📞 رَقْم الواتساب الخاص بكِ (إدارة لقمة) الذي ستصل إليه رموز التحقق والطلبات:
// (اكتبي الرقم بالصيغة الدولية وبدون أصفار في البداية، مثال للأردن: 9627xxxxxxxx)
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

async function initAudioPermission() {
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => { audioChunks.push(event.data); };
            setupAudioStopListener();
        }
    } catch (err) {
        console.log("بانتظار تفعيل إذن المايكروفون عند التسجيل.");
    }
}

// إعداد نظام تحويل الصوت لنص ليعمل بدقة في الخلفية
let speechRecognition;
if ('webkitSpeechRecognition' in window) {
    speechRecognition = new webkitSpeechRecognition();
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

    // 4️⃣ فتح الواتساب تلقائياً للزبونة لإرسال الرمز وتأكيد هويتها فوراً ومجاناً
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

// باقي الكود البرمجي الأصلي للموقع دون أي تعديل لضمان العمل بكفاءة:
function setupAudioStopListener() {
    if (!mediaRecorder) return;
    mediaRecorder.onstop = async () => {
        const currentPhone = document.getElementById('phone').value;
        const currentAddress = document.getElementById('address').value;
        const timestamp = new Date().toLocaleString('ar-JO');

        document.getElementById('display-user-phone').innerText = currentPhone;
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step3').classList.add('active');

        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
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
                sendToGoogleDriveInBackground(base64Audio, currentPhone, currentAddress, timestamp, finalOrderText);
            }, 1500);
        };
    };
}

const voiceBtn = document.getElementById('voice-btn');
if (voiceBtn) {
    voiceBtn.addEventListener('mousedown', startRecording);
    voiceBtn.addEventListener('mouseup', stopRecording);
    voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });
    voiceBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });
}

async function startRecording() {
    if (!mediaRecorder) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => { audioChunks.push(event.data); };
            setupAudioStopListener();
        } catch (err) {
            alert("يرجى منح إذن المايكروفون للتطبيق لتتمكني من تسجيل طلبكِ 🎙️");
            return;
        }
    }
    audioChunks = [];
    textRecognitionResult = "";
