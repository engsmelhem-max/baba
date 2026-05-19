let recognition;
let finalTranscript = "";
// جلب الطلبات السابقة مع التأكد من الاحتفاظ بآخر 5 طلبات فقط
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];
if (orders.length > 5) {
    orders = orders.slice(-5);
    localStorage.setItem('myOrders', JSON.stringify(orders));
}
let userLocationUrl = "لم يتم تحديد الموقع"; 

// دالة تنفذ تلقائياً فور فتح الموقع لتعبئة البيانات السابقة إن وجدت
window.onload = function() {
    const savedPhone = localStorage.getItem('savedPhone');
    const savedAddress = localStorage.getItem('savedAddress');
    
    if (savedPhone) {
        document.getElementById('phone').value = savedPhone;
    }
    if (savedAddress) {
        document.getElementById('address').value = savedAddress;
    }
};

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
            // إضافة الطلب الجديد للسجل المحلي
            orders.push({ date: new Date().toLocaleString('ar-JO'), text: orderText });
            
            // ميزة تحديد آخر 5 طلبات فقط وحذف الأقدم تلقائياً
            if (orders.length > 5) {
                orders = orders.slice(-5);
            }
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

// 5. دالة الانتقال وحفظ البيانات المدخلة وتنشيط الأذونات
function goToStep2() {
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();

    if(phone && address) {
        // ميزة حفظ آخر إدخال في المتصفح ليعبأ تلقائياً في المرة القادمة
        localStorage.setItem('savedPhone', phone);
        localStorage.setItem('savedAddress', address);

        document.getElementById('step1').classList.remove('active');
        document.getElementById('step2').classList.add('active');
        
        requestLocation();
        requestMicrophonePermission();
    } else {
        alert("لطفاً، أدخلي رقم الهاتف والعنوان أولاً لتتمكني من الطلب 💖");
    }
}

// 6. باقي الدوال الخاصة بالمساعدة والطلبات السابقة والنوافذ المنبثقة
function showHelp() {
    const helpText = `
        <div style="text-align:right; font-family:'Tajawal', sans-serif;">
            <h3 style="color:#f25c7e; margin-top:0;">🌸 آلية عمل التطبيق:</h3>
            <p>1. تأكدي من بياناتكِ في الصفحة الأولى واضغطي استمرار (سيتم حفظ بياناتكِ تلقائياً للمرات القادمة).</p>
            <p>2. وافقي على أذونات المتصفح لتفعيل ميزات التطبيق السحرية.</p>
            <p>3. اضغطي مطولاً على الزر الأحمر، تحدثي بطلبكِ، ثم افلتي الزر وسيصلنا كل شيء فوراً!</p>
        </div>
    `;
    openModal(helpText);
}

function showHistory() {
    let historyHtml = "<div style='text-align:right; font-family:\"Tajawal\", sans-serif;'>";
    historyHtml += "<h3 style='color:#f25c7e; margin-top:0;'>📋 آخر 5 طلبات لكِ:</h3>";
    if (orders.length > 0) {
        // عكس الترتيب ليعرض الطلب الأحدث في الأعلى دائماً لراحة الزبونة
        let displayOrders = [...orders].reverse();
        displayOrders.forEach(order => {
            historyHtml += `
                <div style='border-bottom:1px solid #ffe5ec; padding:12px 0;'>
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

function closeModal() {
    document.getElementById('modal').style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
