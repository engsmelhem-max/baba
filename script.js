let mediaRecorder;
let audioChunks = [];
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];
if (orders.length > 5) {
    orders = orders.slice(-5);
    localStorage.setItem('myOrders', JSON.stringify(orders));
}
let userLocationUrl = "لم يتم تحديد الموقع"; 
let textRecognitionResult = "جاري معالجة النص...";

window.onload = function() {
    const savedPhone = localStorage.getItem('savedPhone');
    const savedAddress = localStorage.getItem('savedAddress');
    if (savedPhone) document.getElementById('phone').value = savedPhone;
    if (savedAddress) document.getElementById('address').value = savedAddress;
};

// إعداد نظام تحويل الصوت لنص المجاني المدمج ليعمل بالتوازي مع تسجيل الملف
let speechRecognition;
if ('webkitSpeechRecognition' in window) {
    speechRecognition = new webkitSpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'ar-JO';

    speechRecognition.onresult = (event) => {
        textRecognitionResult = event.results[0][0].transcript;
        document.getElementById('transcription').innerText = textRecognitionResult;
    };
}

async function goToStep2() {
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();

    if(phone && address) {
        localStorage.setItem('savedPhone', phone);
        localStorage.setItem('savedAddress', address);

        document.getElementById('step1').classList.remove('active');
        document.getElementById('step2').classList.add('active');
        
        requestLocation();
        
        // تفعيل المايكروفون للتسجيل
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                document.getElementById('status-text').innerText = "جاري رفع الملف الصوتي وإرسال الطلب... ⏳";
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                
                // رفع الصوت مجاناً والحصول على الرابط
                uploadAudioAndSend(audioBlob);
            };
        } catch (err) {
            alert("يرجى منح إذن المايكروفون للتسجيل.");
        }
    } else {
        alert("لطفاً، أدخلي رقم الهاتف والعنوان أولاً لتتمكني من الطلب 💖");
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
    textRecognitionResult = "لم يتم التقاط نص";
    document.getElementById('transcription').innerText = "";
    document.getElementById('status-text').innerText = "جاري تسجيل صوتكِ بجودة واضحة... 🎙️";
    
    mediaRecorder.start();
    if(speechRecognition) try { speechRecognition.start(); } catch(e){}
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== "recording") return;
    mediaRecorder.stop();
    if(speechRecognition) try { speechRecognition.stop(); } catch(e){}
}

// دالة رفع الصوت المجانية بالكامل وسريعة جداً
function uploadAudioAndSend(audioBlob) {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice-order.mp3");

    // نستخدم خدمة tmpfiles.org الرفع المجانية والسريعة لملفات الـ MP3
    fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        // تحويل الرابط لرابط مباشر للتحميل والاستماع فوراً
        if (result.data && result.data.url) {
            let rawUrl = result.data.url;
            let directAudioUrl = rawUrl.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
            
            // إرسال كل البيانات للـ Sheet وموقعها رابط الصوت!
            sendToDashboard(directAudioUrl);
        } else {
            sendToDashboard("فشل رفع الصوت - تم إرسال النص فقط");
        }
    })
    .catch(error => {
        console.error("خطأ في الرفع:", error);
        sendToDashboard("خطأ في شبكة رفع الصوت");
    });
}

function sendToDashboard(audioUrl) {
    const phoneInput = document.getElementById('phone').value;
    const addressInput = document.getElementById('address').value;
    const sheetDbUrl = "https://sheetdb.io/api/v1/uk768ymhv9vyi"; 

    const payload = {
        data: [
            {
                phone: phoneInput,
                address: addressInput,
                order: textRecognitionResult, // النص المكتوب تلقائياً ومجاناً
                time: new Date().toLocaleString('ar-JO'),
                location: userLocationUrl,
                audio: audioUrl // رابط المقطع الصوتي لسماعه بضغطة زر!
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
            orders.push({ date: new Date().toLocaleString('ar-JO'), text: textRecognitionResult });
            if (orders.length > 5) orders = orders.slice(-5);
            localStorage.setItem('myOrders', JSON.stringify(orders));
            
            alert("تم إرسال طلبكِ الصوتي بنجاح! 🎉");
            document.getElementById('transcription').innerText = "";
            document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
        }
    })
    .catch(error => {
        alert("يرجى التحقق من اتصالكِ بالإنترنت.");
    });
}

function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                userLocationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            },
            (error) => { userLocationUrl = "الزبونة رفضت مشاركة الموقع"; },
            { enableHighAccuracy: true, timeout: 10000 } 
        );
    }
}

function showHelp() {
    const helpText = `<div style="text-align:right; font-family:'Tajawal', sans-serif;">
        <h3 style="color:#f25c7e; margin-top:0;">🌸 آلية عمل التطبيق المطور:</h3>
        <p>1. أدخلي بياناتكِ واضغطي استمرار.</p>
        <p>2. اضغطي مطولاً وسجلي طلبكِ بصوتكِ براحتكِ.</p>
        <p>3. عند الإفلات، سيصلنا صوتكِ الأصلي المسجل مع موقعكِ الجغرافي والنص المكتوب فوراً!</p>
    </div>`;
    openModal(helpText);
}

function showHistory() {
    let historyHtml = "<div style='text-align:right; font-family:\"Tajawal\", sans-serif;'>";
    historyHtml += "<h3 style='color:#f25c7e; margin-top:0;'>📋 آخر 5 طلبات لكِ:</h3>";
    if (orders.length > 0) {
        let displayOrders = [...orders].reverse();
        displayOrders.forEach(order => {
            historyHtml += `<div style='border-bottom:1px solid #ffe5ec; padding:12px 0;'>
                <span style='color:#333; font-weight:bold;'>• ${order.text}</span><br>
                <small style='color:#aaa;'>${order.date}</small>
            </div>`;
        });
    } else {
        historyHtml += "<p style='color:#777;'>لا توجد لديكِ طلبات سابقة حتى الآن.</p>";
    }
    historyHtml += "</div>";
    openModal(historyHtml);
}

function openModal(content) {
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal').style.display = "block";
}
function closeModal() { document.getElementById('modal').style.display = "none"; }
window.onclick = function(event) { if (event.target == document.getElementById('modal')) closeModal(); }
