const async = require("async");
const { ProgressBar } = require("ascii-progress");
const fs = require("fs");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const path = require("path");
const readline = require("readline");

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

if (!output.endsWith("/")) {
	output = output + "/";
}

let fullPath = path.resolve(output);

if (!fs.existsSync(fullPath)) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.question(
		`The directory ${fullPath} does not exist. Do you want to create it? (y/n) `,
		(answer) => {
			if (answer === "y") {
				fs.mkdir(fullPath, { recursive: true }, (err) => {
					if (err) {
						console.log(
							`An error occured while creating the directory ${fullPath}: ${err}`
						);
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
		}
	);
} else {
	main();
}

async function getPlaylist(url) {
	console.log("Getting playlist");
	const firstResultBatch = await ytpl(/list=([a-zA-Z0-9_-]+)/.exec(url)[1], { pages: 1 });
	console.log("found " + firstResultBatch.items.length + " items in playlist");
	return firstResultBatch;
}

async function main() {
	let { items } = await getPlaylist(url);

	async.mapLimit(
		items,
		threads,
		(item, callback) => {
			const bar = new ProgressBar({
				schema: ":title [:bar] :percent/:size :elapseds/:etas",
				completed: "█",
				blank: " ",
				total: 100,
				width: 1024,
			});

			let { title, id } = item;
			let size;

			title = title.length < 35 ? title + " ".repeat(35 - title.length) : title;

			bar.tick(0, { title: "Starting " + title.substring(0, 26), size: "0MB" });

			return new Promise((resolve, reject) => {
				const donwloader = ytdl(id, { filter, quality });
				donwloader.pipe(
					fs.createWriteStream(
						`${fullPath}${title}.${filter.includes("video") ? "mp4" : "mp3"}`
					)
				);

				donwloader.on("response", function (res) {
					let totalSize = res.headers["content-length"];
					let dataRead = 0;

					size = Math.round(totalSize / 1000000) + "MB";

					res.on("data", function (data) {
						dataRead += data.length;
						let percent = dataRead / totalSize;
						bar.update(percent, {
							title: title.substring(0, 35),
							size,
						});
					});
				});

				donwloader.on("end", () => {
					bar.tick(100, { title: title.substring(0, 35), size });
					callback(null, title);
					resolve();
				});

				donwloader.on("error", (err) => {
					bar.update(0, { title: "Error downloading " + title.substring(0, 17), size });
					callback(err);
					reject(err);
				});
			});
		},
		(err) => {
			if (err) {
				console.log(err);
				process.exit(1);
			} else {
				console.log("\n\33[32mDownload complete!\33[0m " + items.length + " Files saved at: " + output);
				process.exit(0);
			}
		}
	);
}
