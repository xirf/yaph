<h1 align="center"><b>Yet Another Playlist Harvester</b></h1>

YAPH is a simple playlist downloader for YouTube. Does not require any login or API key.


please note that this is a **work in progress** and not all features are implemented yet. this tools still have a lot of dependencies and bugs. if you find any bugs or have any suggestions please open an [issue here](https://github.com/itzankan/yaph/issues).

<br>

# Installation

```bash
# clone the repo
$ git clone https://github.com/itzanka/yaph.git

# change the working directory
$ cd yaph

# install the dependencies
$ pnpm i 
```
# Usage
```bash
$ node .
Usage : ypdl <url> [-t <number>] [-f <filter>] [-q <quality>] [-o <output>]
Options :
         --help, -h     Show this help message.
         -t <number>    Number of threads to use (default: 5).
         -f <filter>    Filter file to download (default: audioandvideo)
                        Available filters: audioandvideo, video, videoonly,
                        audio, audioonly.
         -q <quality>   Set the quality of the downloaded file
                        (default: highestaudio)
                        Available qualities: highestaudio, highestvideo,
                        lowestaudio, lowestvideo, highest, lowest.
         -o <output>    Set the output directory (default: current directory).
```
## Examples
```bash
# download with default settings
$ node . https://www.youtube.com/playlist?list=PLw-VjHDlEOgvb8ZrZQYq4w9R3oiApNV53

# Download from YT Music
$ node . https://music.youtube.com/playlist?list=PLRXpXJVsBRVh8Ms2ZSS_CMf2_TRLMqH-D&feature=share

# Set thread 
$ node . https://www.youtube.com/playlist?list=PLw-VjHDlEOgvb8ZrZQYq4w9R3oiApNV53 -t 10

# Set filter
$ node . https://www.youtube.com/playlist?list=PLw-VjHDlEOgvb8ZrZQYq4w9R3oiApNV53 -f audioonly

# Set quality
$ node . https://www.youtube.com/playlist?list=PLw-VjHDlEOgvb8ZrZQYq4w9R3oiApNV53 -q highest

# Set output directory
$ node . https://www.youtube.com/playlist?list=PLw-VjHDlEOgvb8ZrZQYq4w9R3oiApNV53 -o D:/Music

# Set all options
$ node . https://www.youtube.com/playlist?list=PLw-VjHDlEOgvb8ZrZQYq4w9R3oiApNV53 -t 10 -f audioonly -q highest -o D:/Music
```

## Future Plans
- [ ] Add support for more sites
- [ ] Add support for download range
- [ ] Add support for download non playlist urls
- [ ] Add support for download from file
- [ ] Add support for nodejs package

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Thanks to
- [node-ytdl-core](https://github.com/fent/node-ytdl-core)
- [node-ytpl](https://github.com/TimeForANinja/node-ytpl)
- [async](https://github.com/caolan/async)

## License
[MIT](https://choosealicense.com/licenses/mit/)