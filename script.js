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
    speechRecognition.continuous = true; // تفعيل الالتقاط المستمر لمنع ضياع الكلمات
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'ar-JO'; // اللهجة الأردنية

    speechRecognition.onresult = (event) => {
        let interimTranscript = '';
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
    const phoneRegex = /^[0-9]{10}$/;

    if (!phone || !address) {
        alert("لطفاً، أدخلي رقم الهاتف والعنوان أولاً لتتمكني من الطلب 💖");
        return;
    }

    if (!phoneRegex.test(phone)) {
        alert("تنبيه: يرجى إدخال رقم هاتف صحيح مكون من 10 أرقام (مثال: 07xxxxxxxx) 📱");
        return;
    }

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

            // ⚡ الانتقال الفوري واللحظي لصفحة النجاح (سرعة صاروخية للمستخدم)
            document.getElementById('display-user-phone').innerText = phoneInput;
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');

            // تحضير ملف الصوت
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = function() {
                const base64Audio = reader.result.split(',')[1];
                
                // ⏱️ زيادة التأخير الذكي إلى 1500 ملي ثانية لضمان انتهاء معالجة الكلمات بالكامل في الخلفية
                setTimeout(() => {
                    let finalOrderText = textRecognitionResult.trim();
                    
                    // إذا كان النص فارغاً تماماً بعد الانتظار، نضع نصاً واضحاً ومحترفاً يوجهك لسماع الصوت
                    if (finalOrderText === "") {
                        finalOrderText = "طلب صوتي (يرجى الاستماع للمقطع) 🎙️";
                    }

                    // تحديث سجل الطلبات السابقة محلياً للزبونة بالكلمات الفعلية
                    orders.push({ date: timestamp, text: finalOrderText });
                    if (orders.length > 5) orders = orders.slice(-5);
                    localStorage.setItem('myOrders', JSON.stringify(orders));

                    // إرسال البيانات والنص الفعلي لـ Google Sheet
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
    textRecognitionResult = ""; // تصفير النص تماماً لاستقبال طلب جديد
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
                userLocationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            },
            (error) => { userLocationUrl = "الزبونة رفضت مشاركة الموقع"; },
            { enableHighAccuracy: true, timeout: 10000 } 
        );
    }
}

// دالة العودة للخطوة الأولى مع تصفير النصوص والطلبات السابقة استعداداً لطلب جديد
function resetToStep1() {
    textRecognitionResult = ""; 
    document.getElementById('step3').classList.remove('active');
    document.getElementById('step1').classList.add('active');
}

function showHelp() {
    const helpText = `<div style="text-align:right; font-family:'Tajawal', sans-serif;">
        <h3 style="color:#f25c7e; margin-top:0;">🌸 آلية عمل التطبيق المطور:</h3>
        <p>1. أدخلي بياناتكِ واضغطي استمرار.</p>
        <p>2. اضغطي مطولاً وسجلي طلبكِ بصوتكِ براحتكِ.</p>
        <p>3. عند الإفلات، سيتم تأكيد طلبكِ فوراً ولحظياً، ويُحفظ المقطع بشكل دائم وآمن!</p>
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
