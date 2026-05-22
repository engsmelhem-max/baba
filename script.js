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
    const phoneInputEl = document.getElementById('phone');
    const addressInputEl = document.getElementById('address');

    if (!phoneInputEl || !addressInputEl) {
        console.error("عناصر الإدخال غير موجودة في الـ HTML");
        return;
    }

    const phone = phoneInputEl.value.trim();
    const address = addressInputEl.value.trim();
    
    // الفحص الصارم لرقم الهاتف الأردني (10 أرقام ويبدأ بـ 07)
    const jordanPhoneRegex = /^07[0-9]{8}$/;

    // 1. حالة نسيان إدخال الحقول
    if (!phone || !address) {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur(); 
        }
        setTimeout(() => {
            alert("لطفاً، أدخلي رقم الهاتف والعنوان أولاً لتتمكني من الطلب 💖");
        }, 100);
        return;
    }

    // 2. حالة إدخال رقم خاطئ أو أقل من 10 أرقام أو لا يبدأ بـ 07
    if (!jordanPhoneRegex.test(phone)) {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur(); 
        }
        setTimeout(() => {
            alert("تنبيه: يجب أن يتكون رقم الهاتف من 10 أرقام بالضبط، وأن يبدأ إجبارياً بـ 07 (مثال: 07xxxxxxxx) 📱");
        }, 100); 
        return;
    }

    // إذا كانت البيانات سليمة تماماً، يتم الانتقال فوراً
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
            const currentPhone = document.getElementById('phone').value;
            const currentAddress = document.getElementById('address').value;
            const timestamp = new Date().toLocaleString('ar-JO');

            document.getElementById('display-user-phone').innerText = currentPhone;
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');

            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader
