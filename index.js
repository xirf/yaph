// ----------------------------------------
// 	Imports
// ----------------------------------------
const async = require("async");
const cliProgress = require("cli-progress");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");

// ----------------------------------------
// 	Regex to check if the URL is a valid
// 	YouTube playlist URL
const urlRegex = /^(https?:\/\/)?(www\.)?(music\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/;

// ----------------------------------------
// 	Get command line arguments
// ----------------------------------------
let args = process.argv.slice(2);

// ----------------------------------------
// 	Progress bar initialization and options
// ----------------------------------------
const bars = new cliProgress.MultiBar(
	{
		clearOnComplete: true,
		hideCursor: true,
		format: "{title} [{bar}] {percentage}% | ETA: {eta}s | {dataRead}/{size}",
	},
	cliProgress.Presets.shades_grey
);

// ----------------------------------------
// Show help message if no arguments are given
// or if the help flag is present
// ----------------------------------------
if (args.length < 1 || args.indexOf("-h") > 0 || args.indexOf("--help") > 0) {
	console.log(
		"Usage : yaph <url> [-t <number>] [-f <filter>] [-q <quality>] [-o <output>]\n" +
			"Options : \n" +
			"\t --help, -h \tShow this help message.\n" +
			"\t -t <number> \tNumber of threads to use (default: 5).\n" +
			"\t -f <filter> \tFilter file to download (default: audioandvideo)\n" +
			"\t\t\tAvailable filters: audioandvideo, video, videoonly,\n" +
			"\t\t\taudio, audioonly.\n" +
			"\t -q <quality>\tSet the quality of the downloaded file\n" +
			"\t\t\t(default: highestaudio)\n" +
			"\t\t\tAvailable qualities: highestaudio, highestvideo,\n" +
			"\t\t\tlowestaudio, lowestvideo, highest, lowest.\n" +
			"\t -o <output>\tSet the output directory (default: current directory)."
	);
	process.exit(1);
}

// ----------------------------------------
// 	Argument parsing
// ----------------------------------------
const url = args[0];
const threads = args.indexOf("-t") > 0 ? args[args.indexOf("-t") + 1] : 5;
const filter = args.indexOf("-f") > 0 ? args[args.indexOf("-f") + 1] : "audioandvideo";
const quality = args.indexOf("-q") > 0 ? args[args.indexOf("-q") + 1] : "highestaudio";
let output = args.indexOf("-o") > 0 ? args[args.indexOf("-o") + 1] : "./downloads/";
let fullPath = path.resolve(output);

// ----------------------------------------
// 	Argument validation
// ----------------------------------------
if (!url.startsWith("http") || !urlRegex.test(url)) {
	console.log(`Unknown URL format:\x1B[31m ${url} \x1B[0m please try again.`);
	process.exit(1);
}

// ----------------------------------------
// 	Directory validation
// ----------------------------------------
if (!fs.existsSync(fullPath)) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	// ----------------------------------------
	//  If the directory does not exist
	// 	Ask user if they want to create the directory
	// ----------------------------------------
	rl.question(`The directory ${fullPath} does not exist. Do you want to create it? (y/n) `, (answer) => {
		if (answer === "y") {
			fs.mkdir(fullPath, { recursive: true }, (err) => {
				if (err) {
					console.log(`An error occured while creating the directory ${fullPath}: ${err}`);
				} else {
					console.log(`Directory ${fullPath} has been created.`);
					main();
				}
				rl.close();
			});
		} else {
			console.log("Exiting...");
			rl.close();
		}
	});
} else {
	main(); // If the directory exists, start the download
}

// ----------------------------------------
// 	Get the playlist items
// ----------------------------------------
async function getPlaylist(url) {
	console.log("Getting playlist");
	const firstResultBatch = await ytpl(/list=([a-zA-Z0-9_-]+)/.exec(url)[1], { pages: 1 });
	console.log("found " + firstResultBatch.items.length + " items in playlist");
	return firstResultBatch;
}

// ----------------------------------------
// 	Download the item given
// ----------------------------------------
function downloader(item, callback) {
	let { title, id } = item;
	let size, dividerUnit;

	let bar = bars.create(100, 0, { title: title.substring(0, 35), size: "0MB", dataRead: "0" });

	// ----------------------------------------
	// 	Replace invalid characters in the title
	// 	so that the file can be saved
	// ----------------------------------------
	title = title.replace(/[\\/:*?"<>|]/g, "_");

	// ----------------------------------------
	// 	Make sure the title is not too long
	// ----------------------------------------
	title = title.length < 35 ? title + " ".repeat(35 - title.length) : title;

	// ----------------------------------------
	// 	Let the user know that the download has
	//  started
	// ----------------------------------------
	bar.update(0, { title: "Starting " + title.substring(0, 26), size: "0MB" });

	return new Promise((resolve, reject) => {
		const donwloader = ytdl(id, { filter, quality });
		donwloader.pipe(fs.createWriteStream(`${fullPath}/${title}.${filter.includes("video") ? "mp4" : "mp3"}`));

		donwloader.on("response", function (res) {
			let totalSize = res.headers["content-length"];
			let dataRead = 0;

			// ----------------------------------------
			// 	Check if the size is in KB, MB or GB
			// ----------------------------------------
			if (totalSize < 1000000) {
				size = Math.round(totalSize / 1000) + "KB";
				dividerUnit = 1000;
			} else if (totalSize < 1000000000) {
				size = Math.round(totalSize / 1000000) + "MB";
				dividerUnit = 1000000;
			} else {
				size = Math.round(totalSize / 1000000000) + "GB";
				dividerUnit = 1000000000;
			}

			res.on("data", function (data) {
				dataRead += data.length;
				let dataChanges = Math.ceil((dataRead / totalSize) * 100);
				bar.update(dataChanges, { title: title.substring(0, 35), size, dataRead: Math.round(dataRead / dividerUnit) });
			});
		});

		donwloader.on("end", () => {
			bar.update(100, { title: title.substring(0, 35), size });
			callback(null);
			resolve();
		});

		donwloader.on("error", (err) => {
			bar.update(0, { title: "Error downloading " + title.substring(0, 17), size });
			callback(err);
			reject(err);
		});
	});
}

// ----------------------------------------
// 	Download the playlist items
// ----------------------------------------
async function main() {
	let { items } = await getPlaylist(url);

	async.mapLimit(
		items,
		threads,
		(item, callback) => {
			downloader(item, callback);
		},
		(err) => {
			if (err) {
				console.log(err);
				process.exit(1);
			} else {
				console.log(`\n\x1B[32mDownload complete!\x1B[0m ${items.length} Files saved at: ${output}`);
				process.exit(0);
			}
		}
	);
}
