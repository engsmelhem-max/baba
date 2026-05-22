let mediaRecorder;
let audioChunks = [];
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];
if (orders.length > 5) {
    orders = orders.slice(-5);
    localStorage.setItem('myOrders', JSON.stringify(orders));
}
let userLocationUrl = "لم يتم تحديد الموقع"; 
let textRecognitionResult = ""; 

// 🔗 رابط الـ Web App الفعال الخاص بكِ:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwn8HUbtIBYlc9FU89vUl_yDD7u_T13_fcxpnIILGbpiY_Gqs-EPpZRbnDYqre4J0g/exec"; 

window.onload = function() {
    const savedPhone = localStorage.getItem('savedPhone');
    const savedAddress = localStorage.getItem('savedAddress');
    if (savedPhone) document.getElementById('phone').value = savedPhone;
    if (savedAddress) document.getElementById('address').value = savedAddress;
};

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

async function goToStep2() {
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    
    // الفحص الصارم لرقم الهاتف الأردني (10 أرقام ويبدأ بـ 07)
    const jordanPhoneRegex = /^07[0-9]{8}$/;

    // 1. حالة نسيان إدخال الحقول
    if (!phone || !address) {
        if (document.activeElement) document.activeElement.blur(); // إخفاء الكيبورد فوراً
        setTimeout(() => {
            alert("لطفاً، أدخلي رقم الهاتف والعنوان أولاً لتتمكني من الطلب 💖");
        }, 50);
        return;
    }

    // 2. حالة إدخال رقم خاطئ أو أقل من 10 أرقام أو لا يبدأ بـ 07
    if (!jordanPhoneRegex.test(phone)) {
        if (document.activeElement) document.activeElement.blur(); // إخفاء الكيبورد فوراً وضمان نزوله لقاع الشاشة
        setTimeout(() => {
            alert("تنبيه: يجب أن يتكون رقم الهاتف من 10 أرقام بالضبط، وأن يبدأ إجبارياً بـ 07 (مثال: 07xxxxxxxx) 📱");
        }, 50); // تأخير بسيط جداً بالملي ثانية للتأكد من اختفاء الكيبورد أولاً قبل ظهور المسج
        return;
    }

    // إذا كانت البيانات سليمة تماماً يستمر التطبيق للخطوة التالية
    localStorage.setItem('savedPhone', phone);
    localStorage.setItem('savedAddress', address);

    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    
    requestLocation();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const phoneInput = document.getElementById('phone').value;
            const addressInput = document.getElementById('address').value;
            const timestamp = new Date().toLocaleString('ar-JO');

            document.getElementById('display-user-phone').innerText = phoneInput;
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');

            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = function() {
                const base64Audio = reader.result.split(',')[1];
                
                setTimeout(() => {
                    let finalOrderText = textRecognitionResult.trim();
                    
                    if (finalOrderText === "") {
                        finalOrderText = "طلب صهريج (يرجى الاستماع للمقطع) 🎙️";
                    }

                    orders.push({ date: timestamp, text: finalOrderText });
                    if (orders.length > 5) orders = orders.slice(-5);
                    localStorage.setItem('myOrders', JSON.stringify(orders));

                    sendToGoogleDriveInBackground(base64Audio, phoneInput, addressInput, timestamp, finalOrderText);
                }, 1500);
            };
        };
    } catch (err) {
        alert("يرجى منح إذن المايكروفون للتسجيل.");
    }
}

const voiceBtn = document.getElementById('voice-btn');
voiceBtn.addEventListener('mousedown', startRecording);
voiceBtn.addEventListener('mouseup', stopRecording);
voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });
voiceBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });

function startRecording() {
    if (!mediaRecorder) return;
    audioChunks = [];
    textRecognitionResult = ""; 
    document.getElementById('status-text').innerText = "جاري تسجيل صوتكِ بجودة واضحة... 🎙️";
    
    mediaRecorder.start();
    if(speechRecognition) {
        try { speechRecognition.start(); } catch(e){}
    }
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== "recording") return;
    mediaRecorder.stop();
    if(speechRecognition) {
        try { speechRecognition.stop(); } catch(e){}
    }
    document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
}

function sendToGoogleDriveInBackground(base64Audio, phoneInput, addressInput, timestamp, textOrder) {
    const payload = {
        data: [
            {
                phone: phoneInput,
                address: addressInput,
                order: textOrder, 
                time: timestamp,
                location: userLocationUrl,
                audioData: base64Audio,
                audioName: `voice-order-${phoneInput}-${Date.now()}.mp3`
            }
        ]
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .catch(error => {
        console.error("تم الإرسال بنجاح:", error);
    });
}

function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                userLocationUrl = `
