const fs = require('fs');
const ffmpeg = require("fluent-ffmpeg");
const ytpl = require('ytpl');
const ytdl = require('ytdl-core');
require('colors');

console.log("starting...");
const url = process.argv[2];
const state = [0, 0, 0]; // state (downloading, downloaded, converted) used for log
/* --------------------------- launch downloading --------------------------- */
if (url) downloadAudio();
else console.log("Missing argument [URL]".red.bold);

async function downloadAudio() {
    try {
        if (ytpl.validateID(url)) {
            /* -------------------------------- playlist -------------------------------- */
            const { items:playlist } = await ytpl(url);
            const length = playlist.length;
            playlist.forEach(video => saveAudio(video.shortUrl, video.title, length));
        } else if (ytdl.validateURL(url)) {
            /* ---------------------------------- video --------------------------------- */
            const { videoDetails: { title } } = await ytdl.getInfo(url);
            saveAudio(url, title, 1);
        } else {
            /* --------------------------------- invalid -------------------------------- */
            console.log(`Invalid URL ${url} \n`.red.bold + `Please provide a valid full url to a youtube video or playlist`.red);
        }
    } catch (err) { console.error("error: " + err) };
}

function saveAudio(link, name, length) {
    /* ------------------------------ name cleanup ------------------------------ */
    name = name
        .replaceAll("-", "")
        .replaceAll("  ", " ")
        .replaceAll(" ", "_")
        .replaceAll(/[^a-z0-9_]/ig, "");
    /* --------------------------------- logging -------------------------------- */
    if (state[0] === 0) console.log(`downloading videos...`.yellow.bold + ` (1/4)`.cyan);
    console.log(`downloading audio file ${name}... `.gray);
    state[0]++;
    if (state[0] === length) console.log(`saving audio...`.yellow.bold + ` (2/4)`.cyan);
    /* ------------------------------ ytdl download ----------------------------- */
    const audio = ytdl(link,{ filter: 'audioonly', quality: "highestaudio" });
    audio.pipe(fs.createWriteStream(`./export/${name}-raw`));
    audio.on("error", console.error)
    audio.on("end", () => {
        /* --------------------------------- logging -------------------------------- */
        console.log(`file ${name} saved processing... `.gray);
        state[1]++;
        if (state[1] === length) console.log(`Processing audio...`.yellow.bold + ` (3/4)`.cyan);
        /* ---------------------------- ffmpeg conversion --------------------------- */
        ffmpeg(`./export/${name}-raw`)
            .toFormat('mp3')
            .save(`./export/${name}.mp3`)
            .on('error', console.error)
            .on("end", () => {
                /* --------------------------------- loggin --------------------------------- */
                state[2]++
                console.log(`file ${name} processed `.gray);
                if (state[2] === length) console.log(`videos successfully processed!`.green.bold + ` (4/4)`.cyan);
                /* --------------------------- removing temp files -------------------------- */
                fs.rmSync(`./export/${name}-raw`);
            });
    });
}
