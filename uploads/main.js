// let currentHour=new Date().getHours();var greetingElement=document.getElementById("navbar-desktop-greeting");if(currentHour>=5&&currentHour<12){greetingElement.textContent="Good morning, everyone"}else if(currentHour>=12&&currentHour<18){greetingElement.textContent="Good afternoon, everyone"}else{greetingElement.textContent="Good evening, everyone"}
gsap.registerPlugin();

let lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time)=>{lenis.raf(time * 1100)})
gsap.ticker.lagSmoothing(0)


const links = document.querySelectorAll(".js-text");
let marquee = document.querySelector('.text-single')

console.log(marquee)

// assign the timeline returned from the helper function to 'loop'
let loop = horizontalLoop(links, {
    repeat: -1,
    speed: 1 + 0.5,
    draggable: true,
    reversed: false,
    paddingRight: parseFloat(gsap.getProperty(links[0], "marginRight", "px"))
});

// handle the timeline on hover
marquee.addEventListener("mouseenter", () => {
    loop.pause()
})

marquee.addEventListener("mouseleave", () => {
    loop.play()
})

// handle the timeline on scroll

let currentScroll = 0;
let scrollDirection = 1;

window.addEventListener("scroll", () => {
    let direction = window.pageYOffset > currentScroll ? 1 : -1;
    if (direction !== scrollDirection) {
        gsap.to(loop, { timeScale: direction, overwrite: true });
        scrollDirection = direction;
    }
    currentScroll = window.pageYOffset;
});



/*
This helper function makes a group of elements animate along the x-axis in a seamless, responsive loop.

Features:
 - Uses xPercent so that even if the widths change (like if the window gets resized), it should still work in most cases.
 - When each item animates to the left or right enough, it will loop back to the other side
 - Optionally pass in a config object with values like "speed" (default: 1, which travels at roughly 100 pixels per second), paused (boolean),  repeat, reversed, and paddingRight.
 - The returned timeline will have the following methods added to it:
   - next() - animates to the next element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - previous() - animates to the previous element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - toIndex() - pass in a zero-based index value of the element that it should animate to, and optionally pass in a vars object to control duration, easing, etc. Always goes in the shortest direction
   - current() - returns the current index (if an animation is in-progress, it reflects the final index)
   - times - an Array of the times on the timeline where each element hits the "starting" spot. There's also a label added accordingly, so "label1" is when the 2nd element reaches the start.
 */
   function horizontalLoop(items, config = {}) {
    items = gsap.utils.toArray(items);
    let tl = gsap.timeline({
            repeat: config.repeat,
            paused: config.paused,
            defaults: { ease: "none" },
            onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)
        }),
        length = items.length,
        startX = items[0].offsetLeft,
        times = [],
        widths = [],
        xPercents = [],
        curIndex = 0,
        pixelsPerSecond = (config.speed || 1) * 100,
        snap = config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1),
        populateWidths = () => items.forEach((el, i) => {
            widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
            xPercents[i] = snap((parseFloat(gsap.getProperty(el, "x", "px")) / widths[i]) * 100 + gsap.getProperty(el, "xPercent"));
        }),
        getTotalWidth = () => items[length - 1].offsetLeft + (xPercents[length - 1] / 100) * widths[length - 1] - startX + items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], "scaleX") + (parseFloat(config.paddingRight) || 0),
        totalWidth, curX, distanceToStart, distanceToLoop, item, i;

    populateWidths();
    gsap.set(items, { xPercent: (i) => xPercents[i] });
    gsap.set(items, { x: 0 });
    totalWidth = getTotalWidth();

    for (i = 0; i < length; i++) {
        item = items[i];
        curX = (xPercents[i] / 100) * widths[i];
        distanceToStart = item.offsetLeft + curX - startX;
        distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");

        tl.to(item, {
            xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
            duration: distanceToLoop / pixelsPerSecond
        }, 0)
        .fromTo(item, {
            xPercent: snap(((curX - distanceToLoop + totalWidth) / widths[i]) * 100)
        }, {
            xPercent: xPercents[i],
            duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
            immediateRender: false
        }, distanceToLoop / pixelsPerSecond)
        .add("label" + i, distanceToStart / pixelsPerSecond);
        
        times[i] = distanceToStart / pixelsPerSecond;
    }

    function toIndex(index, vars = {}) {
        Math.abs(index - curIndex) > length / 2 && (index += index > curIndex ? -length : length);
        let newIndex = gsap.utils.wrap(0, length, index),
            time = times[newIndex];
        if (time > tl.time() !== index > curIndex) {
            vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
            time += tl.duration() * (index > curIndex ? 1 : -1);
        }
        curIndex = newIndex;
        vars.overwrite = true;
        return tl.tweenTo(time, vars);
    }

    tl.next = (vars) => toIndex(curIndex + 1, vars);
    tl.previous = (vars) => toIndex(curIndex - 1, vars);
    tl.current = () => curIndex;
    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.updateIndex = () => (curIndex = Math.round(tl.progress() * (items.length - 1)));
    tl.times = times;
    tl.progress(1, true).progress(0, true);

    if (config.reversed) {
        tl.vars.onReverseComplete();
        tl.reverse();
    }

    if (config.draggable && typeof Draggable === "function") {
        let proxy = document.createElement("div"),
            wrap = gsap.utils.wrap(0, 1),
            ratio, startProgress, draggable, dragSnap, roundFactor,
            align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
            syncIndex = () => tl.updateIndex();

        typeof InertiaPlugin === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");

        draggable = Draggable.create(proxy, {
            trigger: items[0].parentNode,
            type: "x",
            onPress() {
                startProgress = tl.progress();
                tl.progress(0);
                populateWidths();
                totalWidth = getTotalWidth();
                ratio = 1 / totalWidth;
                dragSnap = totalWidth / items.length;
                roundFactor = Math.pow(10, ((dragSnap + "").split(".")[1] || "").length);
                tl.progress(startProgress);
            },
            onDrag: align,
            onThrowUpdate: align,
            inertia: true,
            snap: (value) => {
                let n = Math.round(parseFloat(value) / dragSnap) * dragSnap * roundFactor;
                return (n - (n % 1)) / roundFactor;
            },
            onRelease: syncIndex,
            onThrowComplete: () => gsap.set(proxy, { x: 0 }) && syncIndex()
        })[0];
    }

    return tl;
}



// document.addEventListener('DOMContentLoaded', (event) => {
//     const emailLink = document.getElementById('email-link');
//     const phoneLink = document.getElementById('phone-link');

//     emailLink.addEventListener('click', (event) => copyToClipboard(event, 'hcksalman@gmail.com', 'Email copied'));
//     phoneLink.addEventListener('click', (event) => copyToClipboard(event, '+1234567890', 'Phone number copied'));
// });

// function copyToClipboard(event, text, copiedText) {
//     event.preventDefault();
//     navigator.clipboard.writeText(text).then(function() {
//         const link = event.target;
//         const originalText = link.textContent;
//         link.textContent = copiedText;
//         link.classList.add('copied');
//         setTimeout(() => {
//             link.textContent = originalText;
//             link.classList.remove('copied');
//         }, 2000);
//     }, function(err) {
//         console.error('Could not copy text: ', err);
//     });
// }
// let btn = document.querySelector(".button"),
// spinIcon = document.querySelector(".spinner"),
// btnText = document.querySelector(".btn-text");
// btn.addEventListener("click", () => {
// btn.classList.add("checked");
// spinIcon.classList.add("spin");
// btnText.textContent = "Loading";
// setTimeout(() => {
// btn.style.pointerEvents = "none";
// spinIcon.classList.replace("spinner", "check");
// spinIcon.classList.replace("fa-circle-notch", "fa-check");
// btnText.textContent = "Done";
// }, 1500) //1s = 1000ms
// });

// var resumeDownloadDiv = document.querySelector(".resume-download");
// resumeDownloadDiv.addEventListener("click", function() {
// function navigateToURL() {window.location.href = "https://www.canva.com";}
// setTimeout(navigateToURL, 1500);});






//         let h1Text = document.getElementById('heading').innerText;
//         let splitText = h1Text.split('');
//         let newHtml = '';
//         splitText.forEach(function(character) {
//             newHtml += '<span>' + character + '</span>';
//         });
//         document.getElementById('heading').innerHTML = newHtml;

//         gsap.from("#heading span", {
//             duration: 0.6,
//             y: 150,
//             stagger: 0.1,
//             scrollTrigger: {
//             trigger: '#heading span',
//             start: "top 100%",
//             end: "bottom 80%",
//           }
//         });



//         gsap.to(".hero-section #scroll-down", {
//           duration: 1,
//           opacity: 0,
//           scrollTrigger: {
//           trigger: '.hero-section #scroll-down',
//           start: "top 70%",
//           end: "bottom 10%",
//           scrub: true
//           }
//       });

//         gsap.to(".absolute-home-marquee", {
//           duration: 3,
//           x: '-6%',
//           scrollTrigger: {
//           trigger: '.absolute-home-marquee',
//           start: "top 100%",
//           end: "bottom 0%",
//           scrub: true
//           }
//       });

//         gsap.from(".sub-hero .col-lg-8 h5>p>span", {
//           duration: 1,
//           y: 100,
//           delay: 0.4
//       });
//         gsap.from(".sub-hero .col-lg-4 a>span", {
//           duration: 1.6,
//           y: 100,
//           delay: 0
//       });

























let elements = document.querySelectorAll(".rolling-text");

elements.forEach((element) => {
    let innerText = element.innerText;
    element.innerHTML = "";

    let textContainer = document.createElement("div");
    textContainer.classList.add("block");

    for(let letter of innerText) {
        let span = document.createElement("span");
        span.innerText = letter.trim() === "" ? "\xa0" : letter;
        span.classList.add("letter");
        textContainer.appendChild(span);
    }

    element.appendChild(textContainer);
    element.appendChild(textContainer.cloneNode(true));
});


elements.forEach((element) => {
    element.addEventListener("mouseover", () => {
        element.classList.remove("play");
    });
});



// const velocity = 50;

// function shuffle(array) {
//   for (let j, x, i = array.length; i; j = Math.floor(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);
//   return array;
// }

// function shuffleText(element, originalText) {
//   const elementTextArray = [...originalText];
//   let randomText = [];

//   function repeatShuffle(times, index) {
//     if (index === times) {
//       element.textContent = originalText;
//       return;
//     }

//     setTimeout(() => {
//       randomText = shuffle(elementTextArray);

//       for (let i = 0; i < index; i++) {
//         randomText[i] = originalText[i];
//       }

//       element.textContent = randomText.join('');
//       repeatShuffle(times, ++index);
//     }, velocity);
//   }

//   repeatShuffle(element.textContent.length, 0);
// }

// const shuffleElements = document.querySelectorAll('.shuffle');

// shuffleElements.forEach(element => {
//   element.dataset.text = element.textContent;
//   element.addEventListener('mouseenter', () => shuffleText(element, element.dataset.text));
// });



// // mouse cursor
document.addEventListener("DOMContentLoaded",()=>{gsap.set(".ball",{xPercent:-50,yPercent:-50});const ball=document.querySelector(".ball"),pos={x:window.innerWidth/2,y:window.innerHeight/2},mouse={x:pos.x,y:pos.y},speed=0.08,xSet=gsap.quickSetter(ball,"x","px"),ySet=gsap.quickSetter(ball,"y","px");window.addEventListener("mousemove",e=>(mouse.x=e.x,mouse.y=e.y));document.querySelectorAll(".link-hover").forEach(linkHover=>{linkHover.addEventListener("mouseenter",()=>gsap.to(".ball",{scale:5,duration:0.3,ease:"power2.out"}));linkHover.addEventListener("mouseleave",()=>gsap.to(".ball",{scale:1,duration:0.3,ease:"power2.out"}))});gsap.ticker.add(()=>{const dt=1.0-Math.pow(1.0-speed,gsap.ticker.deltaRatio());pos.x+=(mouse.x-pos.x)*dt;pos.y+=(mouse.y-pos.y)*dt;xSet(pos.x);ySet(pos.y)})});
  










// You can disable right-click on your webpage using JavaScript:
//   document.addEventListener('contextmenu', function(e) {
//     e.preventDefault();
// });



// let btn = document.querySelector('.btn-ripple');

// btn.onmousemove = (e) => {
// let x = e.pageX - btn.offsetLeft;
// let y = e.pageY - btn.offsetTop;

// btn.style.setProperty('--x', x + 'px');
// btn.style.setProperty('--y', y + 'px');
// };

// document.addEventListener('DOMContentLoaded', function() {
//     var btnRipple = document.querySelector('.btn-ripple');
    
//     btnRipple.addEventListener('click', function(event) {
//         event.preventDefault();
        
//         // Change the button content
//         var span = btnRipple.querySelector('span');
//         span.innerHTML = '<i class="ri-check-line"></i> Done';
        
//         // Add a small delay to follow the link
//         setTimeout(function() {
//             window.location.href = btnRipple.getAttribute('href');
//         }, 300);
//     });
// });




// const animSettings={duration:1,y:'100',scrollTrigger:{start:"top 100%",end:"bottom 0%"}};gsap.from(".footer > .t > p",{...animSettings,scrollTrigger:{...animSettings.scrollTrigger,trigger:'.footer > .t > p'}});gsap.from(".footer > .b > p",{...animSettings,delay:0.3,scrollTrigger:{...animSettings.scrollTrigger,trigger:'.footer > .b > p'}});gsap.from(".footer > .c > p",{...animSettings,delay:0.2,scrollTrigger:{...animSettings.scrollTrigger,trigger:'.footer > .c > p'}});gsap.to(".footer > img",{duration:3,top:'40%',scrollTrigger:{trigger:'.footer > img',start:"top 70%",end:"bottom 0%",scrub:true}});