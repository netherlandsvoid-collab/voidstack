import { writeFileSync } from "node:fs";
const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1050" viewBox="0 0 900 1050"><defs>${defs}</defs>${body}</svg>`;
const noise =
  '<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".07"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>';
writeFileSync(
  "public/art/soft-forms.svg",
  svg(
    `<rect width="900" height="1050" fill="url(#bg)"/><ellipse cx="470" cy="846" rx="300" ry="52" fill="#63506d" opacity=".12" filter="url(#blur)"/><g filter="url(#grain)"><path d="M300 800 C110 760 110 550 210 470 C290 410 310 440 330 340 C350 200 520 150 620 250 C700 330 590 420 640 490 C710 570 720 740 580 800Z" fill="url(#form)"/><path d="M330 340 C300 450 460 490 500 430 C580 310 490 300 510 250" fill="none" stroke="#efe8f2" stroke-width="83" stroke-linecap="round"/><ellipse cx="598" cy="710" rx="116" ry="118" fill="url(#orb)"/></g><text x="52" y="74" font-family="Arial" font-size="13" letter-spacing="5" fill="#9a87a0">EXPLORATIONS IN FORM / 001</text>`,
    `${noise}<linearGradient id="bg" x2="1" y2="1"><stop stop-color="#e7dfeb"/><stop offset="1" stop-color="#d2c9db"/></linearGradient><linearGradient id="form" x1="0" x2="1" y2=".6"><stop stop-color="#c1a8cc"/><stop offset=".3" stop-color="#f7edf9"/><stop offset=".55" stop-color="#decde8"/><stop offset=".8" stop-color="#b49ac5"/><stop offset="1" stop-color="#8f769f"/></linearGradient><radialGradient id="orb" cx=".3" cy=".25"><stop stop-color="#fff4e8"/><stop offset=".65" stop-color="#dfc9bd"/><stop offset="1" stop-color="#ae8e9f"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="20"/></filter>`,
  ),
);
writeFileSync(
  "public/art/forma.svg",
  svg(
    `<rect width="900" height="1050" fill="#e4e1d8"/><g transform="rotate(-9 450 525)"><rect x="130" y="190" width="620" height="760" fill="#b7b4a9" opacity=".25"/><rect x="110" y="165" width="620" height="760" fill="#f6f4ea"/><text x="155" y="240" font-family="Arial" font-size="14" letter-spacing="5" fill="#57584e">SPACES WITH PURPOSE.</text><text x="145" y="440" font-family="Georgia" font-size="168" letter-spacing="-13" fill="#50594a">forma</text><path d="M160 800 V610 Q275 440 390 610 V800Z" fill="#9caa8d"/><path d="M420 800 V610 Q535 440 650 610 V800Z" fill="#c6cbbb"/><path d="M160 800 L390 610V800Z" fill="#73836b"/><path d="M420 800L650 610V800Z" fill="#a7b49a"/><text x="155" y="867" font-family="Arial" font-size="12" letter-spacing="2" fill="#777d6b">ARCHITECTURE &amp; INTERIORS</text><text x="610" y="867" font-family="Arial" font-size="12" fill="#777d6b">EST. 2025</text></g>`,
    noise,
  ),
);
writeFileSync(
  "public/art/coast.svg",
  svg(
    `<rect width="900" height="1050" fill="url(#sky)"/><circle cx="680" cy="260" r="80" fill="#fcf4d9" opacity=".7"/><path d="M0 570 Q190 430 390 560T900 490V1050H0Z" fill="#abb9b2"/><path d="M0 680 Q300 500 900 640V1050H0Z" fill="#708d87"/><path d="M0 790Q200 750 300 650L430 580 500 690 410 810 400 1050H0Z" fill="#d9cab4"/><path d="M0 840Q160 800 260 730L380 650 415 720 330 840 300 1050H0Z" fill="#8b9981"/><path d="M900 730Q700 680 545 760T310 1030" fill="none" stroke="#dae4d8" stroke-width="8" opacity=".6"/><g opacity=".4" stroke="#dbe4df" fill="none"><path d="M580 850Q700 800 900 820"/><path d="M650 930Q760 880 900 900"/><path d="M700 700Q800 680 900 700"/></g><text x="60" y="90" font-family="Georgia" font-size="35" fill="#8c9c96" font-style="italic">Somewhere, slowly.</text>`,
    '<linearGradient id="sky" x2="0" y2="1"><stop stop-color="#d5e1dc"/><stop offset="1" stop-color="#f2eadb"/></linearGradient>',
  ),
);
writeFileSync(
  "public/art/objects.svg",
  svg(
    `<rect width="900" height="1050" fill="#e8dfcf"/><path d="M650 0L900 0V1050H170Z" fill="#f3eddf"/><ellipse cx="455" cy="867" rx="290" ry="43" fill="#a9987c" opacity=".18"/><g filter="url(#grain)"><path d="M160 790V610Q160 560 210 550L225 405H335L350 550Q400 560 400 610V790Q280 850 160 790Z" fill="url(#vase)"/><ellipse cx="280" cy="405" rx="55" ry="11" fill="#8b7760"/><path d="M460 830V590Q460 445 600 445Q740 445 740 590V830Z" fill="#c0b3a0"/><path d="M520 830V600Q520 510 600 510Q680 510 680 600V830Z" fill="#eae2d5"/><circle cx="600" cy="767" r="63" fill="#a09b7f"/></g><text x="70" y="115" font-family="Georgia" font-size="49" fill="#95866f">Objects of a</text><text x="70" y="175" font-family="Georgia" font-size="49" fill="#95866f" font-style="italic">quieter kind.</text>`,
    `${noise}<linearGradient id="vase"><stop stop-color="#ab886b"/><stop offset=".4" stop-color="#d1af8d"/><stop offset="1" stop-color="#9e785d"/></linearGradient>`,
  ),
);
writeFileSync(
  "public/art/chromatic.svg",
  svg(
    `<rect width="900" height="1050" fill="#e6b698"/><path d="M0 100Q450 500 900 0V390Q420 730 0 410Z" fill="#b5bed0"/><path d="M0 410Q450 800 900 390V650Q450 1020 0 700Z" fill="#d96047"/><path d="M0 700Q450 1060 900 650V1050H0Z" fill="#7b8d73"/><path d="M0 180Q450 590 900 180" fill="none" stroke="#fbdfaa" stroke-width="45"/><circle cx="610" cy="680" r="140" fill="#ebc257"/><circle cx="610" cy="680" r="90" fill="#d96047"/><text x="60" y="955" font-family="Arial" font-size="14" letter-spacing="6" fill="#f0e7ca">ROOM FOR IMAGINATION</text>`,
    noise,
  ),
);
writeFileSync(
  "public/art/mountains.svg",
  svg(
    `<rect width="900" height="1050" fill="#d3dedf"/><circle cx="640" cy="280" r="100" fill="#f1e2bd"/><path d="M0 800L210 280 440 710 620 450 900 830V1050H0Z" fill="#aeb9b1"/><path d="M70 1050L430 350 760 1050Z" fill="#738e87"/><path d="M430 350L310 580 430 530 540 580Z" fill="#e5e5d9"/><path d="M450 530L430 350 760 1050H590Z" fill="#5d7974"/><path d="M0 930Q330 850 900 1050H0Z" fill="#3f6863"/><text x="60" y="110" font-family="Georgia" font-size="42" fill="#6c8584">Between earth &amp; sky.</text>`,
  ),
);
for (let i = 0; i < 5; i++) {
  const colors = ["#b9a3b7", "#a8b5a0", "#c7ab8d", "#9caaa8", "#d4ad91"],
    skin = ["#e0b9a1", "#c69f83", "#dfb99d", "#c69b7e", "#e2bda0"];
  writeFileSync(
    `public/art/avatar-${i}.svg`,
    svg(
      `<rect width="900" height="1050" fill="${colors[i]}"/><ellipse cx="450" cy="1060" rx="360" ry="380" fill="${i % 2 ? "#424c46" : "#e1d6c5"}"/><ellipse cx="450" cy="510" rx="210" ry="270" fill="${skin[i]}"/><path d="M230 570Q120 100 460 140Q780 140 660 600L610 350Q450 420 300 320Z" fill="${i % 2 ? "#4c4037" : "#403733"}"/><circle cx="380" cy="510" r="12" fill="#52423a"/><circle cx="520" cy="510" r="12" fill="#52423a"/><path d="M400 640Q450 670 500 635" stroke="#aa7969" stroke-width="12" fill="none"/>`,
    ),
  );
}
