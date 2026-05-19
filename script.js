let recognition;
let finalTranscript = "";
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];
let userLocationUrl = "لم يتم تحديد الموقع"; 

// 1. إعداد نظام التعرف على الصوت (Web Speech API)
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-JO'; 

    recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        document.getElementById('transcription').innerText = finalTranscript + interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error("خطأ في الصوت:", event.error);
    };
}

// دالة طلب إذن المايكروفون مباشرة فور فتح الصفحة الثانية
function requestMicrophonePermission() {
    if (recognition) {
        try {
            // تشغيل وإيقاف سريع جداً لإجبار المتصفح على طلب الإذن فوراً
            recognition.start();
            setTimeout(() => {
                recognition.stop();
            }, 100); 
        } catch (e) {
            console.log("تم طلب إذن المايكروفون مسبقاً أو يعمل حالياً");
        }
    }
}

// 2. ربط أحداث الزر الأحمر التفاعلي
const voiceBtn = document.getElementById('voice-btn');

voiceBtn.addEventListener('mousedown', startRecording);
voiceBtn.addEventListener('mouseup', stopAndSend);

voiceBtn.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    startRecording(); 
});
voiceBtn.addEventListener('touchend', (e) => { 
    e.preventDefault(); 
    stopAndSend(); 
});

function startRecording() {
    finalTranscript = "";
    document.getElementById('transcription').innerText = "";
    document.getElementById('status-text').innerText = "جاري الاستماع لطلبكِ... 🎙️";
    try {
        recognition.start();
    } catch (e) {}
}

function stopAndSend() {
    try {
        recognition.stop();
    } catch (e) {}
    
    document.getElementById('status-text').innerText = "تمت عملية التسجيل! جاري الإرسال والتقاط الموقع...";
    
    setTimeout(() => {
        sendToDashboard();
    }, 1000);
}

// 3. دالة جلب الموقع الجغرافي الدقيق وتحويله لرابط Google Maps
function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                userLocationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                console.log("تم تحديد الموقع بنجاح:", userLocationUrl);
            },
            (error) => {
                console.error("خطأ في جلب الموقع:", error.message);
                userLocationUrl = "الزبونة رفضت مشاركة الموقع أو الخدمة معطلة";
            },
            { enableHighAccuracy: true, timeout: 10000 } 
        );
    } else {
        userLocationUrl = "المتصفح لا يدعم تحديد الموقع";
    }
}

// 4. دالة إرسال البيانات المحدثة لـ SheetDB
function sendToDashboard() {
    const phoneInput = document.getElementById('phone').value;
    const addressInput = document.getElementById('address').value;
    const orderText = document.getElementById('transcription').innerText.trim();

    if (!orderText) {
        document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
        alert("لم يتم التقاط أي صوت، يرجى الضغط المطول والتحدث بطلبكِ 🌸");
        return;
    }

    const sheetDbUrl = "https://sheetdb.io/api/v1/uk768ymhv9vyi"; 

    const payload = {
        data: [
            {
                phone: phoneInput,
                address: addressInput,
                order: orderText,
                time: new Date().toLocaleString('ar-JO'),
                location: userLocationUrl 
            }
        ]
    };

    fetch(sheetDbUrl, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        if (result.created === 1) {
            orders.push({ date: new Date().toLocaleString('ar-JO'), text: orderText });
            localStorage.setItem('myOrders', JSON.stringify(orders));
            
            alert("تم إرسال طلبكِ وموقعكِ بنجاح! 🎉");
            document.getElementById('transcription').innerText = "";
            document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
        } else {
            alert("حدث خطأ أثناء الإرسال، يرجى المحاولة مجدداً.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("يرجى التحقق من اتصالكِ بالإنترنت.");
    });
}

// 5. تعديل دالة الانتقال لطلب الموقع والمايكروفون فوراً
function goToStep2() {
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();

    if(phone && address) {
        document.getElementById('step1').classList.remove('active');
        document.getElementById
