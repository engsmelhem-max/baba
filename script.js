let recognition;
let finalTranscript = "";
let orders = JSON.parse(localStorage.getItem('myOrders')) || [];

// 1. إعداد نظام التعرف على الصوت (Web Speech API)
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-JO'; // تعيين اللهجة لتناسب الأردن لتكون دقيقة جداً

    recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        // عرض النص أولاً بأول للزبونة أثناء حديثها بمرونة وسلاسة
        document.getElementById('transcription').innerText = finalTranscript + interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error("خطأ في التعرف على الصوت:", event.error);
        if(event.error === 'not-allowed') {
            alert("لطفاً، قومي بالسماح للموقع باستخدام المايكروفون من إعدادات المتصفح.");
        }
    };
} else {
    alert("المتصفح الحالي لا يدعم ميزة الطلب الصوتي، يرجى استخدام متصفح Chrome أو Edge.");
}

// 2. ربط أحداث الزر الأحمر التفاعلي (الضغط والإفلات)
const voiceBtn = document.getElementById('voice-btn');

// أحداث الكمبيوتر (الماوس)
voiceBtn.addEventListener('mousedown', startRecording);
voiceBtn.addEventListener('mouseup', stopAndSend);

// أحداث الهواتف الذكية (اللمس) لمنع أي تعليق أو تداخل
voiceBtn.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    startRecording(); 
});
voiceBtn.addEventListener('touchend', (e) => { 
    e.preventDefault(); 
    stopAndSend(); 
});

// دالة بدء التسجيل عند الضغط المستمر
function startRecording() {
    finalTranscript = "";
    document.getElementById('transcription').innerText = "";
    document.getElementById('status-text').innerText = "جاري الاستماع لطلبكِ... 🎙️";
    try {
        recognition.start();
    } catch (e) {
        console.log("المايكروفون يعمل بالفعل");
    }
}

// دالة إيقاف التسجيل والإرسال التلقائي عند إفلات الزر
function stopAndSend() {
    try {
        recognition.stop();
    } catch (e) {
        console.log("المايكروفون متوقف بالفعل");
    }
    
    document.getElementById('status-text').innerText = "تمت عملية التسجيل! جاري الإرسال الآن...";
    
    // تأخير بسيط لمدة ثانية لضمان تجميع الكلمات الأخيرة وإرسالها بشكل صحيح
    setTimeout(() => {
        sendToDashboard();
    }, 1000);
}

// 3. دالة إرسال البيانات إلى رابط SheetDB الخاص بكِ
function sendToDashboard() {
    const phoneInput = document.getElementById('phone').value;
    const addressInput = document.getElementById('address').value;
    const orderText = document.getElementById('transcription').innerText.trim();

    // التحقق من أن الزبونة تحدثت بالفعل ولم تترك الزر فارغاً
    if (!orderText) {
        document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
        alert("لم يتم التقاط أي صوت، يرجى الضغط المطول والتحدث بطلبكِ 🌸");
        return;
    }

    // الرابط المباشر الخاص بجدولكِ
    const sheetDbUrl = "https://sheetdb.io/api/v1/uk768ymhv9vyi"; 

    // تجهيز البيانات لترسل وتتطابق مع الأعمدة (phone, address, order, time)
    const payload = {
        data: [
            {
                phone: phoneInput,
                address: addressInput,
                order: orderText,
                time: new Date().toLocaleString('ar-JO') // توقيت الأردن المحلي
            }
        ]
    };

    // إرسال البيانات برمجياً عبر الـ API
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
            // حفظ الطلب في سجل المراجعة المحلي للزبونة (الزر العلوي اليمين)
            orders.push({ date: new Date().toLocaleString('ar-JO'), text: orderText });
            localStorage.setItem('myOrders', JSON.stringify(orders));
            
            alert("تم إرسال طلبكِ بنجاح! وسنقوم بالتواصل معكِ فوراً 🎉");
            document.getElementById('transcription').innerText = "";
            document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
        } else {
            alert("حدث خطأ غير متوقع أثناء إرسال الطلب، يرجى المحاولة مجدداً.");
            document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("يرجى التحقق من اتصالكِ بالإنترنت والمحاولة مرة أخرى.");
        document.getElementById('status-text').innerText = "اضغطي باستمرار للطلب...";
    });
}

// 4. الانتقال السلس من الصفحة الأولى للثانية بعد التحقق من البيانات
function goToStep2() {
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();

    if(phone && address) {
        document.getElementById('step1').classList.remove('active');
        document.getElementById('step2').classList.add('active');
    } else {
        alert("لطفاً، أدخلي رقم الهاتف والعنوان أولاً لتتمكني من الطلب 💖");
    }
}

// 5. نافذة المساعدة (الزر العلوي اليسار "؟")
function showHelp() {
    const helpText = `
        <div style="text-align:right; font-family:'Tajawal', sans-serif;">
            <h3 style="color:#f25c7e; margin-top:0;">🌸 آلية عمل التطبيق:</h3>
            <p>1. قومي بإدخال رقم هاتفك وعنوانكِ في الصفحة الأولى واضغطي استمرار.</p>
            <p>2. في الصفحة التالية، <strong>اضغطي مطولاً بإصبعكِ على الزر الأحمر الكبير</strong> وتحدثي بطلبكِ مباشرة (مثلاً: أريد برغر دجاج مع بطاطا وعصير).</p>
            <p>3. بمجرد أن <strong>تتوقفي عن الحديث وتفعلي إفلات للزر</strong>، سيقوم التطبيق بتحويل صوتكِ إلى كلمات وإرسال الطلب إلينا فوراً كالسحر!</p>
        </div>
    `;
    openModal(helpText);
}

// 6. نافذة مراجعة الطلبات السابقة (الزر العلوي اليمين "📋")
function showHistory() {
    let historyHtml = "<div style='text-align:right; font-family:\"Tajawal\", sans-serif;'>";
    historyHtml += "<h3 style='color:#f25c7e; margin-top:0;'>📋 طلباتكِ السابقة:</h3>";
    
    if (orders.length > 0) {
        orders.forEach(order => {
            historyHtml += `
                <div style='border-bottom:1px solid #ffe5ec; padding:12px 0;'>
                    <span style='color:#333; font-weight:bold;'>• ${order.text}</span><br>
                    <small style='color:#aaa;'>${order.date}</small>
                </div>`;
        });
    } else {
        historyHtml += "<p style='color:#777;'>لا توجد لديكِ طلبات سابقة حتى الآن. ابدئي بطلبكِ الأول الآن! ✨</p>";
    }
    
    historyHtml += "</div>";
    openModal(historyHtml);
}

// 7. التحكم بالنوافذ المنبثقة (Modals)
function openModal(content) {
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal').style.display = "block";
}

function closeModal() {
    document.getElementById('modal').style.display = "none";
}

// إغلاق النافذة المنبثقة عند الضغط في أي مكان خارجها لراحة المستخدم
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
