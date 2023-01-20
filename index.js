const async = require("async");
const { ProgressBar } = require("ascii-progress");
const fs = require("fs");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");

let args = process.argv.slice(2);

if (args.length < 1 || args.indexOf("-h") > 0 || args.indexOf("--help") > 0) {
	console.log(`
Usage   :  ypdl <url> [options]
Options :   
    -t <number>     Number of threads to use (default: 5).
    -h              Show this help message.
    -f  <filter>    Filter file to download (default: audioandvideo)
                    Available filters: audioandvideo, video, videoonly, 
                    audio, audioonly.
    -q <quality>    Set the quality of the downloaded file 
                    (default: highestaudio)
                    Available qualities: highestaudio, highestvideo,
                    lowestaudio, lowestvideo, highest, lowest.
    -o  <output>    Set the output directory (default: current directory).
    `);
	process.exit(1);
}

// parse arguments
const url = args[0];
const threads = args.indexOf("-t") > 0 ? args[args.indexOf("-t") + 1] : 5;
const filter = args.indexOf("-f") > 0 ? args[args.indexOf("-f") + 1] : "audioandvideo";
const quality = args.indexOf("-q") > 0 ? args[args.indexOf("-q") + 1] : "highestaudio";
let output = args.indexOf("-o") > 0 ? args[args.indexOf("-o") + 1] : "./";

const urlRegex = /^(https?:\/\/)?(www\.)?(music\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/;
if (!url.startsWith("http") || !urlRegex.test(url)) {
	console.log("Unknown URL format:\33[31m " + url + "\33[0m please try again.");
	process.exit(1);
}

if (!fs.existsSync(output)) {
	fs.realpath(output, (err, _) => {
		console.log(
			"Output directory does not exist:\33[31m " + err.path + "\33[0m please try again."
		);
		process.exit(1);
	});
}

if (!output.endsWith("/")) {
	output = output + "/";
}

async function getPlaylist(url) {
	console.log("Getting playlist");
	const firstResultBatch = await ytpl(/list=([a-zA-Z0-9_-]+)/.exec(url)[1], { pages: 1 });
	console.log("found " + firstResultBatch.items.length + " items in playlist");
	return firstResultBatch;
}

async function main() {
	let { items } = await getPlaylist(url);

	const downloadQueue = async.queue(({ id, name, bar }, callback) => {
		new Promise((resolve, reject) => {
			const donwloader = ytdl(id, { filter, quality });

			donwloader.pipe(
				fs.createWriteStream(`${output}${name}.${filter.includes("video") ? "mp4" : "mp3"}`)
			);

			bar.update(0, { title: "Downloading " + name.substring(0, 23), size: "0MB" });

			donwloader.on("response", function (res) {
				var totalSize = res.headers["content-length"];
				var dataRead = 0;
				res.on("data", function (data) {
					dataRead += data.length;
					var percent = dataRead / totalSize;
					bar.update(percent, {
						title: name.substring(0, 35),
						size: Math.round(totalSize / 1000000) + "MB",
					});
				});
			});

			donwloader.on("error", function () {
				multibar.stop();
				resolve();
			});
		})
			.catch((err) => {
				console.log("Error while downloading: " + name);
				reject(err);
			})
			.finally(() => {
				callback();
			});
	}, threads);

	downloadQueue.drain(() => {
		console.log("\n\33[32mDownload complete!\33[0m File saved at: " + output);
		process.exit(0);
	});

	items.forEach((url) => {
		const bar = new ProgressBar({
			clean: true,
			schema: ":title [:bar] :percent/:size :elapseds/:etas",
			completed: "█",
			blank: " ",
			// width: 1000,
			total: 100,
			// fixedWidth: false
		});
		downloadQueue.push({ id: url.id, name: url.title, bar });
	});
}

main();
