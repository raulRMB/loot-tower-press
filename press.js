// Loot Tower press kit. Two small jobs: honour reduced motion for the looping clip, and drive the
// trailer with our own controls instead of YouTube's.

if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
	for (const clip of document.querySelectorAll("video[autoplay]")) {
		clip.removeAttribute("autoplay");
		clip.pause();
		clip.controls = true;
	}
}

// The trailer. Nothing is fetched from YouTube until the visitor presses play: the player script
// is loaded on that first press, with YouTube's own controls switched off, and the bar under the
// picture talks to it through the IFrame Player API.
(() => {
	const root = document.getElementById("trailer-player");
	if (!root) return;

	const cover = root.querySelector(".player-cover");
	const scrub = root.querySelector(".player-scrub:not(.player-level)");
	const level = root.querySelector(".player-level");
	const clock = root.querySelector(".player-time");
	const buttons = {
		toggle: root.querySelector('[data-act="toggle"]'),
		mute: root.querySelector('[data-act="mute"]'),
		full: root.querySelector('[data-act="full"]'),
	};

	const SCRUB_MAX = Number(scrub.max);
	const PLAYING = 1;
	const ENDED = 0;

	let player = null;
	let ready = false;
	let requested = false;
	let dragging = false;
	let duration = 0;
	let ticker = 0;

	const stamp = (seconds) => {
		const whole = Math.max(0, Math.floor(seconds));
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
	};

	const show = (seconds) => {
		clock.textContent = `${stamp(seconds)} / ${stamp(duration)}`;
		const part = duration > 0 ? seconds / duration : 0;
		scrub.style.setProperty("--played", `${Math.min(1, part) * 100}%`);
	};

	const tick = () => {
		if (!ready || dragging) return;
		const now = player.getCurrentTime();
		scrub.value = duration > 0 ? Math.round((now / duration) * SCRUB_MAX) : 0;
		show(now);
	};

	const setPlaying = (playing) => {
		root.classList.toggle("is-playing", playing);
		buttons.toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
		cover.setAttribute("aria-label", playing ? "Pause trailer" : "Play trailer");
		clearInterval(ticker);
		if (playing) ticker = setInterval(tick, 200);
	};

	const request = () => {
		if (requested) return;
		requested = true;
		root.classList.add("is-loading");

		window.onYouTubeIframeAPIReady = () => {
			player = new YT.Player("trailer-video", {
				host: "https://www.youtube-nocookie.com",
				videoId: root.dataset.video,
				playerVars: {
					autoplay: 1,
					controls: 0,
					disablekb: 1,
					fs: 0,
					iv_load_policy: 3,
					playsinline: 1,
					rel: 0,
				},
				events: {
					onReady: () => {
						ready = true;
						duration = player.getDuration();
						scrub.disabled = false;
						root.classList.remove("is-loading");
						root.classList.add("is-started");
						show(0);
						applyVolume();
						player.playVideo();
					},
					onStateChange: (event) => {
						duration = player.getDuration() || duration;
						setPlaying(event.data === PLAYING);
						if (event.data === ENDED) {
							// Back to the poster, so the end screen's suggestions never show.
							root.classList.remove("is-started");
							player.seekTo(0, true);
							player.pauseVideo();
							scrub.value = 0;
							show(0);
						} else if (event.data === PLAYING) {
							root.classList.add("is-started");
						}
						tick();
					},
				},
			});
		};

		const api = document.createElement("script");
		api.src = "https://www.youtube.com/iframe_api";
		document.head.append(api);
	};

	const toggle = () => {
		if (!ready) {
			request();
		} else if (player.getPlayerState() === PLAYING) {
			player.pauseVideo();
		} else {
			player.playVideo();
		}
	};

	cover.addEventListener("click", toggle);
	buttons.toggle.addEventListener("click", toggle);

	// Volume. The track and the speaker button are two views of one setting: dragging to nothing
	// mutes, and unmuting from nothing comes back at the last level that could be heard. Both work
	// before the video has loaded, and the choice is handed to the player once it has.
	let volume = Number(level.value);
	let muted = false;

	const applyVolume = () => {
		const heard = muted ? 0 : volume;
		level.value = heard;
		level.style.setProperty("--played", `${heard}%`);
		root.classList.toggle("is-muted", heard === 0);
		buttons.mute.setAttribute("aria-label", heard === 0 ? "Unmute" : "Mute");
		if (!ready) return;
		player.setVolume(volume);
		if (heard === 0) player.mute();
		else player.unMute();
	};

	buttons.mute.addEventListener("click", () => {
		muted = !muted;
		if (!muted && volume === 0) volume = 50;
		applyVolume();
	});

	level.addEventListener("input", () => {
		const picked = Number(level.value);
		muted = picked === 0;
		if (picked > 0) volume = picked;
		applyVolume();
	});

	scrub.addEventListener("input", () => {
		dragging = true;
		show((scrub.value / SCRUB_MAX) * duration);
	});

	scrub.addEventListener("change", () => {
		if (ready) player.seekTo((scrub.value / SCRUB_MAX) * duration, true);
		dragging = false;
	});

	// Full screen takes the whole player, bar included, so the controls stay ours in there too.
	buttons.full.addEventListener("click", () => {
		if (document.fullscreenElement) document.exitFullscreen();
		else if (root.requestFullscreen) root.requestFullscreen();
	});

	document.addEventListener("fullscreenchange", () => {
		const full = document.fullscreenElement === root;
		buttons.full.setAttribute("aria-label", full ? "Exit full screen" : "Full screen");
	});
})();
