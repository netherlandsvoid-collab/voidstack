const menuToggle=document.querySelector(".menu-toggle");
const mainNav=document.querySelector(".main-nav");
if(menuToggle&&mainNav){menuToggle.addEventListener("click",()=>{const open=mainNav.classList.toggle("open");menuToggle.setAttribute("aria-expanded",String(open));menuToggle.textContent=open?"×":"☰";});mainNav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{mainNav.classList.remove("open");menuToggle.setAttribute("aria-expanded","false");menuToggle.textContent="☰";}));}
const filterButtons=[...document.querySelectorAll(".filter-button")],artCards=[...document.querySelectorAll(".art-card")];
function filterArtwork(category){filterButtons.forEach(b=>{const active=b.dataset.filter===category;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});artCards.forEach(c=>c.hidden=category!=="All"&&c.dataset.category!==category);}
filterButtons.forEach(b=>{b.setAttribute("aria-pressed",String(b.classList.contains("active")));b.addEventListener("click",()=>filterArtwork(b.dataset.filter));});
document.querySelectorAll("[data-category-link]").forEach(a=>a.addEventListener("click",()=>{try{sessionStorage.setItem("artWorldCategory",a.dataset.categoryLink)}catch(e){}}));
if(location.pathname.endsWith("explore.html")){try{const category=sessionStorage.getItem("artWorldCategory");if(category){filterArtwork(category);sessionStorage.removeItem("artWorldCategory")}}catch(e){}}
const toast=document.querySelector("#toast");let toastTimer;
function showToast(message){if(!toast)return;toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),3800);}
const artistForm=document.querySelector("#artist-form");
if(artistForm)artistForm.addEventListener("submit",e=>{e.preventDefault();const name=new FormData(artistForm).get("name")||"artist";document.querySelector("#artist-status").textContent=`Thank you, ${name}! Your demo submission is ready, but has not been sent or saved.`;showToast("Demo only — connect a backend to receive applications.");});
const contactForm=document.querySelector("#contact-form");
if(contactForm)contactForm.addEventListener("submit",e=>{e.preventDefault();document.querySelector("#contact-status").textContent="Thank you! This demo form does not send or store messages.";showToast("Demo form submitted — no message was sent.");});
const newsletterForm=document.querySelector("#newsletter-form");
if(newsletterForm)newsletterForm.addEventListener("submit",e=>{e.preventDefault();document.querySelector("#newsletter-message").textContent="Thanks! This demo does not subscribe you to a mailing list.";showToast("Newsletter demo submitted — no email was sent.");newsletterForm.reset();});
