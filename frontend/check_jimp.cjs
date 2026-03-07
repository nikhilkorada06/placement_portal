const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

async function check() {
    const file = '/Users/mohammadsakib/Desktop/placement_portal/frontend/public/company-logos/google.png';
    const image = await Jimp.read(file);
    console.log("Functions on image object:");
    console.log(Object.keys(image).filter(k => typeof image[k] === 'function'));
    console.log("Prototype functions:");
    let proto = Object.getPrototypeOf(image);
    console.log(Object.getOwnPropertyNames(proto).filter(k => typeof proto[k] === 'function'));
}
check();
