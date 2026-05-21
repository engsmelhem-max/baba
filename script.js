let mediaRecorder;
let audioChunks = [];
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];
if (orders.length > 5) {
    orders = orders.slice(-5);
    localStorage.setItem('myOrders', JSON.stringify(orders));
}
let userLocationUrl = "لم يتم تحديد الموقع"; 
let textRecognitionResult = "لم يتم التقاط نص";

// الرابط الخاص بكِ لحفظ الملفات بشكل دائم في Google Drive:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzea-IlziBhaO9AyH646kQeCROvMFJHW6B1M-oY91hN0z95NtEh5gZcTx8sqkL4iac/exec"; 

window.onload = function() {
    const savedPhone = localStorage.getItem('savedPhone');
    const savedAddress = localStorage.getItem('savedAddress');
    if (savedPhone) document.getElementById('phone').value = savedPhone;
    if (savedAddress) document.getElementById('address').value = savedAddress;
};

// إعداد نظام تحويل الصوت لنص في الخلفية دون عرضه على الشاشة الرئيسية
let speechRecognition;
if ('webkitSpeechRecognition' in window) {
    speechRecognition = new webkitSpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'ar-JO';

    speechRecognition.onresult = (event) => {
        // يتم حفظ النص برمجياً لإرساله للشيت وللطلبات السابقة دون كتابته بالزهري للمستخدم
        textRecognitionResult = event.results[0][0].transcript;
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
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                // تعديل ذكي: إرسال المستخدم لصفحة النجاح فوراً وبشكل لحظي دون أي انتظار!
                const phoneInput = document.getElementById('phone').value;
                document.getElementById('display-user-phone').innerText = phoneInput;
                
                document.getElementById('step2').classList.remove('active');
                document.getElementById('step3').classList.add('active');

                // تحضير الصوت ومعالجته في الخلفية دون تعطيل الزبونة
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = function() {
                    const base64Audio = reader.result.split(',')[1];
                    
                    // تحديث سجل الطلبات السابقة محلياً ليظهر في الخانة المخصصة فوراً
                    const timestamp = new Date().toLocaleString('ar-JO');
                    setTimeout(() => {
                        orders.push({ date: timestamp, text: textRecognitionResult });
                        if (orders.length > 5) orders = orders.slice(-5);
                        localStorage.setItem('myOrders', JSON.stringify(orders));
                    }, 500);

                    // إرسال البيانات والملف الصوتي سحابياً إلى Google Drive في الخلفية
                    sendToGoogleDriveInBackground(base64Audio, phoneInput, addressInput, timestamp);
                }
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
    textRecognitionResult = "طلب صوتي (جاري التدوين)";
    document.getElementById('status-text').innerText = "جاري تسجيل صوتكِ بجودة واضحة... 🎙️";
    
    mediaRecorder.start();
    if(speechRecognition) try { speechRecognition.start(); } catch(e){}
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== "recording") return;
    mediaRecorder.stop();
    if(speechRecognition) try { speechRecognition.stop(); } catch(e){}
    
    // تصفير نصوص الواجهة فوراً استعداداً لأي طلب جديد
    document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
}

// دالة الإرسال في الخلفية السريعة والصامتة
function sendToGoogleDriveInBackground(base64Audio, phoneInput, addressInput, timestamp) {
    const payload = {
        data: [
            {
                phone: phoneInput,
                address: addressInput,
                order: textRecognitionResult, 
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
    .then(response => response.json())
    .then(result => {
        if (result.created !== 1) {
            console.error("خطأ في حفظ البيانات الاحتياطية بالخلفية");
        }
    })
    .catch(error => {
        console.error("شبكة الخلفية مشغولة:", error);
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

function resetToStep1() {
    document.getElementById('step3').classList.remove('active');
    document.getElementById('step1').classList.add('active');
}

function showHelp() {
    const helpText = `<div style="text-align:right; font-family:'Tajawal', sans-serif;">
        <h3 style="color:#f25c7e; margin-top:0;">🌸 آلية عمل التطبيق المطور:</h3>
        <p>1. أدخلي بياناتكِ واضغطي استمرار.</p>
        <p>2. اضغطي مطولاً وسجلي طلبكِ بصوتكِ براحتكِ.</p>
        <p>3. عند الإفلات، سيتم تأكيد طلبكِ فوراً ويُحفظ صوتكِ بشكل دائم في النظام!</p>
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
