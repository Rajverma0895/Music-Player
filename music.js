document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const musicPlayer = document.querySelector('.music-player');
    const audio = document.getElementById('audio-source');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = playPauseBtn.querySelector('i');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const seekBar = document.getElementById('seek-bar');
    const volumeBar = document.getElementById('volume-bar');
    const volumeIcon = document.getElementById('volume-icon');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');
    const albumArt = document.getElementById('album-art');
    const songTitleEl = document.getElementById('song-title');
    const songArtistEl = document.getElementById('song-artist');
    const songAlbumEl = document.getElementById('song-album');
    const playlistEl = document.getElementById('playlist');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeToggleBtn.querySelector('i');
    const addFilesBtn = document.getElementById('add-files-btn');
    const fileInput = document.getElementById('file-input');
    const equalizer = document.getElementById('equalizer');
    const playbackSpeedSelect = document.getElementById('playback-speed');
    const lyricsContainer = document.getElementById('lyrics-container');
    const lyricsContentEl = document.getElementById('lyrics-content');
    const savePlaylistBtn = document.getElementById('save-playlist-btn');
    const loadPlaylistBtn = document.getElementById('load-playlist-btn');


    // --- State Variables ---
    let playlist = [
        // Default placeholder or your initial sample tracks
         {
            title: "No Tracks Loaded",
            artist: "Add files using the folder icon",
            album: "",
            src: "",
            cover: "placeholder.png",
            lyrics: ""
         }
    ];
    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = 'none'; // 'none', 'one', 'all'
    let currentVolume = 1.0;
    let isSeeking = false;

    // --- Core Functions ---

    // --- Modify loadTrack function to include savePlaybackState ---
    function loadTrack(index) {
        if (index < 0 || index >= playlist.length || !playlist[index]) { // Check for valid track object
             console.error("Invalid track index or track object:", index, playlist[index]);
            if(playlist.length === 0) {
                 displayDefaultState();
            } else if (!playlist[index]?.src) { // Check specifically if src is missing/invalid
                 console.warn(`Track at index ${index} has no valid source.`);
                 // Optionally display default or an error state for this specific track
                 // displayDefaultState(); // Or show 'Track source invalid'
                 // For now, just prevent loading
                 return;
            } else {
                 // Track object exists but might have issues, proceed cautiously or return
                 return;
            }
        }


        const track = playlist[index];

        // Save state *before* potentially failing to load the new track source
        // This ensures the index change is saved even if the new track errors out.
        currentTrackIndex = index; // Update the global index *before* saving state for it
        savePlaybackState(); // <-- Save state reflecting the new index

        songTitleEl.textContent = track.title || "Unknown Title";
        songArtistEl.textContent = track.artist || "Unknown Artist";
        songAlbumEl.textContent = track.album || "";
        albumArt.src = track.cover || 'placeholder.png';

        if (track.lyrics && track.lyrics.trim() !== "") {
            lyricsContentEl.textContent = track.lyrics;
            lyricsContainer.classList.add('visible');
        } else {
            lyricsContainer.classList.remove('visible');
        }
        albumArt.onerror = () => { albumArt.src = 'placeholder.png'; };

        currentTimeEl.textContent = formatTime(0);
        totalDurationEl.textContent = formatTime(0);
        updateSeekBarBackground(0);
        seekBar.value = 0;
        seekBar.disabled = true; // Disable until metadata loads

        // Try loading the source. If it fails, onerror handles it.
        try {
            // Check if src is a blob URL that might be revoked (basic check)
             if (typeof track.src === 'string' && track.src.startsWith('blob:') && !track.fileRef) {
                  // This indicates a potential issue with loaded playlists from localStorage
                  // We might need the user to re-add the file.
                  console.warn(`Attempting to load potentially stale blob URL for track: ${track.title}`);
                  // Optionally, update UI to indicate file needs re-adding
                  // songArtistEl.textContent = "Please re-add this local file.";
             }
            audio.src = track.src; // This might throw an error if src is invalid/revoked
        } catch (error) {
             console.error("Error setting audio source:", error);
             // Handle UI update for failed source setting
             songTitleEl.textContent = "Error Loading Source";
             songArtistEl.textContent = "Track source might be invalid.";
             albumArt.src = 'placeholder.png';
             totalDurationEl.textContent = "0:00";
             seekBar.disabled = true;
             setPlayIcon(false);
             musicPlayer.classList.remove('playing');
             highlightCurrentTrack(); // Still highlight the problematic track in the list
             return; // Stop further processing for this track load
        }


        // console.log("Loading track:", track.src);

        setPlayIcon(false);
        musicPlayer.classList.remove('playing');

        audio.onloadedmetadata = () => {
            // console.log("Metadata loaded, duration:", audio.duration);
            if (isNaN(audio.duration) || audio.duration <= 0) {
                 console.warn("Loaded metadata but duration is invalid:", audio.duration);
                 totalDurationEl.textContent = "0:00";
                 seekBar.disabled = true;
                 updateSeekBarBackground(0);
            } else {
                 totalDurationEl.textContent = formatTime(audio.duration);
                 seekBar.max = audio.duration;
                 seekBar.disabled = false;
                 updateSeekBarBackground(audio.currentTime / audio.duration * 100);
            }
            // State saving happens on play/pause/seek/etc.
        };

        audio.onerror = (e) => {
             console.error("Error loading audio:", audio.error?.message || 'Unknown audio error', "for src:", audio.currentSrc);
             songTitleEl.textContent = "Error Loading Track";
             songArtistEl.textContent = track.title ? `${track.title} - File error` : "File may be corrupt or unsupported";
             songAlbumEl.textContent = "";
             albumArt.src = 'placeholder.png';
             totalDurationEl.textContent = "0:00";
             seekBar.disabled = true;
             setPlayIcon(false);
             musicPlayer.classList.remove('playing');
             highlightCurrentTrack(); // Still highlight the problematic track
        };

        highlightCurrentTrack();
        // No need for another savePlaybackState here, already done at the start
    }


    function displayDefaultState() {
        songTitleEl.textContent = "No Tracks Loaded";
        songArtistEl.textContent = "Add files using the folder icon";
        songAlbumEl.textContent = "";
        albumArt.src = 'placeholder.png';
        currentTimeEl.textContent = "0:00";
        totalDurationEl.textContent = "0:00";
        seekBar.value = 0;
        seekBar.disabled = true;
        updateSeekBarBackground(0);
        lyricsContainer.classList.remove('visible');
        setPlayIcon(false);
        musicPlayer.classList.remove('playing');
        playlistEl.innerHTML = '<li>No tracks loaded. Add files.</li>'; // Provide feedback in playlist too
    }

    function playTrack() {
         // Ensure there's a track loaded and it's ready enough
        if (!audio.src || audio.readyState < (audio.HAVE_METADATA || 2)) { // Use HAVE_METADATA or readyState 2
             console.warn("Audio not ready or no source for playback.");
             // If it's the initial load (no src) AND playlist has items, try loading track 0
             if (!audio.src && playlist.length > 0 && playlist[0].src) {
                 console.log("Attempting to load initial track before playing.");
                 loadTrack(0);
                 // Use 'canplay' event to ensure it's playable after load attempt
                 audio.addEventListener('canplay', () => {
                     console.log("Audio can play now, attempting playback.");
                     audio.play().then(() => {
                        isPlaying = true;
                        setPlayIcon(true);
                        musicPlayer.classList.add('playing');
                     }).catch(handlePlayError);
                 }, { once: true }); // Listen only once
             } else if (audio.src && audio.readyState < (audio.HAVE_METADATA || 2)) {
                  console.log("Audio source set, but not ready. Waiting...");
                  // Maybe show a loading indicator?
                  // You could add a listener here too, but often user interaction (clicking play again) handles it.
             }
             return;
        }

        // If already trying to play (e.g., clicked rapidly), avoid overlapping requests
        if (isPlaying && !audio.paused) {
             console.log("Already playing.");
             return;
        }

        audio.play().then(() => {
            isPlaying = true;
            setPlayIcon(true);
            musicPlayer.classList.add('playing');
            // console.log("Playing track");
        }).catch(handlePlayError);
    }

    // --- Modify pauseTrack function to include savePlaybackState ---
    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        setPlayIcon(false);
        musicPlayer.classList.remove('playing');
        savePlaybackState(); // <-- SAVE STATE ON PAUSE
        // console.log("Paused track");
    }

     function handlePlayError(error) {
          console.error("Play failed:", error?.message || error);
          isPlaying = false;
          setPlayIcon(false);
          musicPlayer.classList.remove('playing');
          // Provide more specific feedback if possible
          if (error.name === 'NotAllowedError') {
             songArtistEl.textContent = "Autoplay blocked. Click play.";
          } else if (error.name === 'NotSupportedError') {
               songArtistEl.textContent = "Audio format not supported.";
          }
          else {
               songArtistEl.textContent = "Playback error occurred.";
          }
     }

    function setPlayIcon(playing) {
        if (playing) {
            playPauseIcon.classList.replace('fa-play', 'fa-pause');
            playPauseBtn.title = "Pause";
        } else {
            playPauseIcon.classList.replace('fa-pause', 'fa-play');
            playPauseBtn.title = "Play";
        }
    }

    function playNext() {
         if (playlist.length <= 1 && repeatMode !== 'one') return; // Only play next if more than one track or repeating one

        let nextIndex;
        if (isShuffle) {
             if (playlist.length <= 1) {
                 nextIndex = 0;
             } else {
                  let randomIndex;
                  do {
                      randomIndex = Math.floor(Math.random() * playlist.length);
                  } while (randomIndex === currentTrackIndex);
                  nextIndex = randomIndex;
             }
        } else {
             nextIndex = (currentTrackIndex + 1) % playlist.length;
        }

        loadTrack(nextIndex);
        // Need a slight delay or wait for 'canplay' if issues arise with immediate play after load
         audio.addEventListener('canplay', () => playTrack(), { once: true });
         // Or simply:
         // setTimeout(playTrack, 50); // Small delay as a simple workaround
    }

    function playPrev() {
        // Allow playing previous even if only one track (restarts it)
        if (playlist.length === 0) return;

        let prevIndex;
        if (isShuffle) {
            if (playlist.length <= 1) {
                prevIndex = 0;
            } else {
                let randomIndex;
                 do {
                     randomIndex = Math.floor(Math.random() * playlist.length);
                 } while (randomIndex === currentTrackIndex);
                 prevIndex = randomIndex;
            }
        } else {
            prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        }

        loadTrack(prevIndex);
        // Need a slight delay or wait for 'canplay' if issues arise with immediate play after load
         audio.addEventListener('canplay', () => playTrack(), { once: true });
         // Or simply:
         // setTimeout(playTrack, 50); // Small delay as a simple workaround
    }

    function updateProgressBar() {
         // Check if seeking or if duration isn't valid
        if (isSeeking || !audio.duration || isNaN(audio.duration) || audio.duration <= 0) {
             // If duration is invalid after loading, ensure UI reflects this
             if (isNaN(audio.duration) || audio.duration <= 0) {
                  currentTimeEl.textContent = "0:00";
                  // Keep total duration as loaded or show "--:--"
                  // totalDurationEl.textContent = formatTime(audio.duration); // Will show 0:00
                  seekBar.value = 0;
                  updateSeekBarBackground(0);
             }
             return; // Exit if seeking or duration invalid
        }

        const progressPercent = (audio.currentTime / audio.duration) * 100;
        seekBar.value = audio.currentTime;
        currentTimeEl.textContent = formatTime(audio.currentTime);

        updateSeekBarBackground(progressPercent);
    }


     function updateSeekBarBackground(percent) {
        const clampedPercent = Math.max(0, Math.min(100, percent || 0)); // Ensure percent is valid, default to 0
        // Use CSS variables for colors
        const progressFill = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
        const progressBg = getComputedStyle(document.documentElement).getPropertyValue('--progress-bg').trim();
        seekBar.style.background = `linear-gradient(to right, ${progressFill} ${clampedPercent}%, ${progressBg} ${clampedPercent}%)`;
     }


    function seek() { // Renamed parameter 'e' from original code as it wasn't used
         if (isNaN(audio.duration) || audio.duration <= 0 || !audio.seekable || audio.seekable.length === 0) {
              console.warn("Cannot seek: Invalid duration or audio not seekable.");
              return; // Can't seek if duration unknown/invalid or media not seekable
         }
         // Ensure the seek value is within the seekable range
         const seekTime = parseFloat(seekBar.value);
          const startSeekable = audio.seekable.start(0); // Usually 0
          const endSeekable = audio.seekable.end(0);   // Usually duration

          if (seekTime >= startSeekable && seekTime <= endSeekable) {
               audio.currentTime = seekTime;
               // updateProgressBar(); // Update immediately for feedback, called by endSeek anyway
          } else {
               console.warn(`Seek time ${seekTime} out of bounds (${startSeekable}-${endSeekable})`);
               // Optionally reset slider to current time if seek fails
               seekBar.value = audio.currentTime;
          }
    }

     function startSeek() {
         isSeeking = true;
         // Optional: Slightly change appearance during seek
         // seekBar.style.cursor = 'grabbing';
     }

     function endSeek() {
         // seekBar.style.cursor = 'pointer'; // Restore cursor
         if (!isSeeking) return; // Prevent accidental calls
         isSeeking = false;
         // Apply the final seek value
         seek(); // Call the seek function to set currentTime
         // If it was playing before seeking, ensure it continues
         // Note: Depending on browser, seeking might pause audio.
         if (isPlaying) {
             // Use a tiny delay to ensure currentTime is set before play resumes
             setTimeout(() => {
                  if (audio.paused) { // Only play if seeking actually paused it
                      audio.play().catch(handlePlayError);
                  }
             }, 10); // Small delay
         }
         savePlaybackState(); // <-- SAVE STATE AFTER SEEKING ENDS
     }


    function setVolume(e) {
        currentVolume = parseFloat(e.target.value) / 100; // Ensure float
        audio.volume = currentVolume;
        audio.muted = false; // Unmute when slider is used
        updateVolumeIcon();
    }

    function updateVolumeIcon() {
        volumeIcon.classList.remove('fa-volume-high', 'fa-volume-low', 'fa-volume-mute'); // Clear all first
        if (audio.muted || audio.volume === 0) {
            volumeIcon.classList.add('fa-volume-mute');
        } else if (audio.volume <= 0.5) {
            volumeIcon.classList.add('fa-volume-low');
        } else {
            volumeIcon.classList.add('fa-volume-high');
        }
    }

    function toggleMute() {
        audio.muted = !audio.muted;
        if (audio.muted) {
             // Save current volume before muting visually
             // currentVolume = audio.volume; // Already tracked by slider input
             volumeBar.value = 0; // Set slider to 0 visually when muted
        } else {
            volumeBar.value = currentVolume * 100; // Restore slider to pre-mute level
        }
        updateVolumeIcon();
        savePlaybackState(); // <-- SAVE STATE ON MUTE TOGGLE
    }

    // --- Modify toggleShuffle function to include savePlaybackState ---
    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
        shuffleBtn.title = isShuffle ? "Shuffle On" : "Shuffle Off";
        savePlaybackState(); // <-- SAVE STATE ON SHUFFLE CHANGE
        // console.log("Shuffle:", isShuffle);
    }

    // --- Modify toggleRepeat function to include savePlaybackState ---
    function toggleRepeat() {
        const repeatIcon = repeatBtn.querySelector('i');
        switch (repeatMode) {
            case 'none':
                repeatMode = 'all';
                repeatBtn.classList.add('active');
                repeatIcon?.classList.remove('fa-1'); // Ensure number overlay is removed
                repeatBtn.title = "Repeat All";
                break;
            case 'all':
                repeatMode = 'one';
                repeatBtn.classList.add('active');
                repeatIcon?.classList.add('fa-1'); // Add number overlay (requires FontAwesome setup)
                repeatBtn.title = "Repeat One";
                break;
            case 'one':
                repeatMode = 'none';
                repeatBtn.classList.remove('active');
                repeatIcon?.classList.remove('fa-1');
                repeatBtn.title = "Repeat Off";
                break;
        }
         repeatBtn.dataset.mode = repeatMode; // Keep dataset updated
         savePlaybackState(); // <-- SAVE STATE ON REPEAT CHANGE
         // console.log("Repeat Mode:", repeatMode);
    }

    function handleTrackEnd() {
        // console.log("Track ended. Repeat mode:", repeatMode);
        if (repeatMode === 'one') {
            audio.currentTime = 0;
            playTrack();
        } else if (isShuffle || repeatMode === 'all' || (repeatMode === 'none' && currentTrackIndex < playlist.length - 1)) {
             // Play next if shuffle is on
             // OR if repeat all is on
             // OR if repeat is off BUT it's not the last track
             playNext();
         } else {
             // Repeat is 'none', shuffle is off, and it was the last track
             pauseTrack(); // Use pauseTrack to set icons and save state correctly
             audio.currentTime = 0; // Reset time to beginning
             seekBar.value = 0;
             updateProgressBar(); // Update UI to show 0:00 / start
             // Optional: Highlight the first track again?
             // currentTrackIndex = 0;
             // highlightCurrentTrack();
             // savePlaybackState(); // Already saved by pauseTrack
         }
    }

    // --- Playlist Management ---

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        if (playlist.length === 0 || (playlist.length === 1 && !playlist[0].src)) { // Check for placeholder accurately
             playlistEl.innerHTML = '<li>No tracks loaded. Add files.</li>';
             // Don't call displayDefaultState() here, it might overwrite loaded track info
             // Let initializePlayer or loadTrack handle the main display update.
             return;
        }

        playlist.forEach((track, index) => {
            const li = document.createElement('li');
            // Indicate if track source seems invalid (e.g., loaded from storage without file)
            const trackDisplayTitle = track.title || 'Unknown Title';
            const trackDisplayArtist = track.artist || 'Unknown Artist';
            const sourceSeemsInvalid = !track.src && !track.fileRef; // Basic check

            li.textContent = `${trackDisplayTitle} - ${trackDisplayArtist}`;
            li.dataset.index = index;
            if (sourceSeemsInvalid) {
                li.style.opacity = '0.6';
                li.title = 'Source missing (re-add local file?)';
            }

            li.addEventListener('click', () => {
                if (sourceSeemsInvalid) {
                    alert(`Source for "${trackDisplayTitle}" is missing. Please re-add the local file.`);
                    return; // Don't try to load if source known to be bad
                }
                if (index !== currentTrackIndex || audio.paused) { // Load+Play if different track or paused
                    loadTrack(index);
                     // Use canplay listener for reliable playback start after load
                     audio.addEventListener('canplay', () => playTrack(), { once: true });
                } else { // If clicking current playing track, pause it
                    pauseTrack();
                }
            });
            playlistEl.appendChild(li);
        });
        highlightCurrentTrack();
    }

    function highlightCurrentTrack() {
        const listItems = playlistEl.querySelectorAll('li');
        listItems.forEach((item) => {
            // Use === comparison after ensuring dataset.index is treated as a number
            if (parseInt(item.dataset.index, 10) === currentTrackIndex) {
                item.classList.add('active');
                // Scroll into view if not already visible
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            } else {
                item.classList.remove('active');
            }
        });
    }

     // --- Modify addTracksToPlaylist function ---
     function addTracksToPlaylist(files) {
         let firstNewTrackIndex = playlist.length; // Index where new tracks will start
         let addedNewTrack = false;

         // Remove placeholder only if adding actual files
         if (playlist.length === 1 && !playlist[0].src && files.length > 0) {
              playlist = [];
              firstNewTrackIndex = 0; // New tracks start from index 0
              currentTrackIndex = 0; // Reset index if playlist was empty placeholder
         }

         for (const file of files) {
             if (file.type.startsWith('audio/')) {
                 let title = file.name.replace(/\.[^/.]+$/, "");
                 let artist = "Unknown Artist";
                 if (title.includes(' - ')) {
                     const parts = title.split(' - ');
                     artist = parts[0].trim();
                     title = parts.slice(1).join(' - ').trim();
                 }

                 const newTrack = {
                     title: title,
                     artist: artist,
                     album: "Local File",
                     src: URL.createObjectURL(file),
                     cover: 'placeholder.png', // Could try jsmediatags here later
                     fileRef: file, // Keep reference
                     lyrics: ""
                 };
                 playlist.push(newTrack);
                 addedNewTrack = true;
             }
         }

         if (addedNewTrack) {
             renderPlaylist(); // Update the UI list

             // Save updated playlist metadata and current playback state
             savePlaylist(); // Save the list with new metadata
             savePlaybackState(); // Save state (index might have changed if list was empty)

             // If player wasn't playing and we added tracks, load the first *new* one
             if (!isPlaying && firstNewTrackIndex < playlist.length) {
                 loadTrack(firstNewTrackIndex);
                 // Optionally auto-play: playTrack(); // Or wait for user click
             }
         }
     }


    // --- Theme Toggling --- (Keep existing functions)
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeIcon.classList.replace(isDarkMode ? 'fa-sun' : 'fa-moon', isDarkMode ? 'fa-moon' : 'fa-sun');
        localStorage.setItem('musicPlayerTheme', isDarkMode ? 'dark' : 'light');
        // Update seek bar after theme change as colors are different
        updateSeekBarBackground(audio.currentTime / audio.duration * 100);
    }

    function loadThemePreference() {
        const savedTheme = localStorage.getItem('musicPlayerTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeIcon.classList.replace('fa-sun','fa-moon');
        } else {
            document.body.classList.remove('dark-mode');
            themeIcon.classList.replace('fa-moon','fa-sun');
        }
    }

    // --- Utility Functions --- (Keep existing)
    function formatTime(seconds) {
         if (isNaN(seconds) || seconds < 0) return "0:00";
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function setPlaybackSpeed() {
        const speed = parseFloat(playbackSpeedSelect.value);
        if (!isNaN(speed)) {
            audio.playbackRate = speed;
            // console.log("Playback speed set to:", speed);
            savePlaybackState(); // <-- Also save state when speed changes
        }
    }

    // --- Playlist Save/Load --- (Keep existing)
    function savePlaylist() {
        const savablePlaylist = playlist.map(track => ({
            title: track.title,
            artist: track.artist,
            album: track.album,
            // Avoid saving blob URLs directly
            src: (typeof track.src === 'string' && track.src.startsWith('blob:')) ? '' : track.src,
            cover: track.cover,
            lyrics: track.lyrics
        }));

        try {
            localStorage.setItem('musicPlayerPlaylist', JSON.stringify(savablePlaylist));
            console.log("Playlist metadata saved to LocalStorage.");
            // Avoid alert for non-critical saves
        } catch (error) {
            console.error("Failed to save playlist to LocalStorage:", error);
            // alert("Error saving playlist."); // Avoid alert
        }
    }

    function loadPlaylist() {
        const savedData = localStorage.getItem('musicPlayerPlaylist');
        if (!savedData) {
            console.log("No saved playlist found.");
            return false; // Nothing loaded
        }

        try {
            const loadedData = JSON.parse(savedData);
            // Replace current playlist
            playlist = loadedData.map(trackData => ({
                title: trackData.title || "Unknown Title",
                artist: trackData.artist || "Unknown Artist",
                album: trackData.album || "",
                 // Restore src if it wasn't a blob URL, otherwise leave empty (requires re-add)
                src: trackData.src || "",
                cover: trackData.cover || "placeholder.png",
                lyrics: trackData.lyrics || "",
                fileRef: null // fileRef cannot be restored from JSON
            }));

            renderPlaylist(); // Update the UI

            console.log("Playlist metadata loaded from LocalStorage.");
            return true; // Success

        } catch (error) {
            console.error("Failed to load/parse playlist:", error);
            localStorage.removeItem('musicPlayerPlaylist'); // Clear corrupted data
            // alert("Error loading playlist."); // Avoid alert
            return false; // Failure
        }
    }

    // +++ Add savePlaybackState function +++
    function savePlaybackState() {
        if (!playlist || playlist.length === 0 || currentTrackIndex < 0 || currentTrackIndex >= playlist.length) {
             // console.warn("Cannot save state: Invalid playlist or index.");
             return; // Don't save if playlist empty or index invalid
        }

        // Only save currentTime if it's valid and audio has potentially played
        const timeToSave = (!isNaN(audio.currentTime) && audio.currentTime > 0 && !isNaN(audio.duration) && audio.duration > 0)
                           ? audio.currentTime
                           : 0; // Save 0 if track hasn't started or has invalid time/duration

        const state = {
            index: currentTrackIndex,
            time: timeToSave,
            volume: audio.muted ? 0 : audio.volume, // Save actual volume, handle mute on load
            muted: audio.muted,
            shuffle: isShuffle,
            repeat: repeatMode,
            playbackRate: audio.playbackRate || 1 // Save playback speed
        };

        try {
            localStorage.setItem('musicPlayerPlaybackState', JSON.stringify(state));
            // console.log("Playback state saved:", state); // Debugging - can be noisy
        } catch (error) {
            // Handle potential storage errors (e.g., quota exceeded)
            console.error("Failed to save playback state to LocalStorage:", error);
        }
    }

    // --- Event Listeners ---
    playPauseBtn.addEventListener('click', () => (isPlaying ? pauseTrack() : playTrack()));
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    shuffleBtn.addEventListener('click', toggleShuffle); // toggleShuffle now saves state
    repeatBtn.addEventListener('click', toggleRepeat); // toggleRepeat now saves state

    audio.addEventListener('timeupdate', updateProgressBar);
    audio.addEventListener('ended', handleTrackEnd);

    seekBar.addEventListener('input', () => {
        if (!isSeeking) return; // Only update visuals if dragging
        updateProgressBar();
    });
    seekBar.addEventListener('mousedown', startSeek);
    seekBar.addEventListener('touchstart', startSeek, { passive: true });
    seekBar.addEventListener('change', endSeek); // endSeek now saves state
    seekBar.addEventListener('mouseup', endSeek);
    seekBar.addEventListener('touchend', endSeek);

    // --- Modify setVolume event listener to save state ---
    volumeBar.addEventListener('input', (e) => {
        setVolume(e);
        savePlaybackState(); // <-- SAVE STATE ON VOLUME CHANGE (via slider)
    });
    volumeIcon.addEventListener('click', toggleMute); // toggleMute now saves state

    themeToggleBtn.addEventListener('click', toggleTheme);

    addFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            addTracksToPlaylist(e.target.files); // addTracksToPlaylist now saves state
            e.target.value = null; // Clear input
        }
    });

    playbackSpeedSelect.addEventListener('change', setPlaybackSpeed); // setPlaybackSpeed now saves state
    savePlaylistBtn.addEventListener('click', () => {
        savePlaylist(); // Explicit save button
        alert("Playlist metadata saved!"); // User feedback for explicit action
    });
    loadPlaylistBtn.addEventListener('click', () => {
         const loaded = loadPlaylist();
         if (loaded) {
             // Playlist loaded, now try to load the playback state for it
             const reloadedState = initializePlayer(true); // Pass flag to indicate it's a reload
             if (reloadedState) {
                 alert("Playlist and playback state loaded!");
             } else {
                  alert("Playlist loaded, but previous playback state not found or invalid. Starting from beginning.");
             }
         } else {
             alert("Could not load playlist.");
         }
    });

    // +++ Add Event Listener for Page Hide/Visibility Change +++
    window.addEventListener('pagehide', (event) => {
        if (!event.persisted) { // Only save if page is truly unloading
             console.log("Page hide detected, saving final playback state.");
             if (isPlaying) {
                 // Don't actually pause audio here, just save the current state as is
                 // audio.pause(); // Avoid side effects on pagehide
             }
            savePlaybackState();
        }
    });
     // Optional: Save more frequently on visibility change?
     // document.addEventListener('visibilitychange', () => {
     //     if (document.visibilityState === 'hidden') {
     //         savePlaybackState();
     //     }
     // });

     // --- Keyboard Shortcuts Listener ---
     function handleKeydown(event) {
        const targetTagName = document.activeElement?.tagName.toUpperCase();
        if (targetTagName === 'INPUT' || targetTagName === 'SELECT' || targetTagName === 'TEXTAREA') {
            return; // Ignore if typing in form elements
        }

        let handled = false;
        switch (event.code) {
            case 'Space':
                playPauseBtn.click();
                handled = true;
                break;
            case 'ArrowRight':
                nextBtn.click();
                handled = true;
                break;
            case 'ArrowLeft':
                prevBtn.click();
                handled = true;
                break;
            case 'ArrowUp':
                { // Use block scope for variable declaration
                    const currentVal = parseFloat(volumeBar.value);
                    const newVal = Math.min(100, currentVal + 5);
                    volumeBar.value = newVal;
                    volumeBar.dispatchEvent(new Event('input', { bubbles: true })); // Trigger listener
                    handled = true;
                }
                break;
            case 'ArrowDown':
                 { // Use block scope
                     const currentVal = parseFloat(volumeBar.value);
                     const newVal = Math.max(0, currentVal - 5);
                     volumeBar.value = newVal;
                     volumeBar.dispatchEvent(new Event('input', { bubbles: true }));
                     handled = true;
                 }
                break;
            case 'KeyM':
                volumeIcon.click();
                handled = true;
                break;
            case 'KeyS':
                shuffleBtn.click();
                handled = true;
                break;
            case 'KeyR':
                repeatBtn.click();
                handled = true;
                break;
        }

        if (handled) {
            event.preventDefault(); // Prevent default browser action (e.g., scrolling)
        }
    }
    document.addEventListener('keydown', handleKeydown);


    // --- Initialization ---
    // --- Replace initializePlayer function ---
    function initializePlayer(isReload = false) { // Add flag for reloads
        if (!isReload) { // Only load theme on initial page load
             loadThemePreference();
        }

        let successfullyLoadedState = false;
        let stateLoadedRequiresPlay = false; // Flag if loaded state implies playing should resume

        // 1. Try loading playlist metadata first (unless it's a reload after clicking Load button)
        let playlistLoaded = false;
        if (!isReload) {
            playlistLoaded = loadPlaylist();
        } else {
             playlistLoaded = true; // Assume playlist is already loaded if triggered by button
        }


        // 2. Try loading playback state only if playlist is available
        if (playlist.length > 0) {
            const savedState = localStorage.getItem('musicPlayerPlaybackState');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);

                    // --- State Validation and Application ---
                    const savedIndex = state.index;
                    if (typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < playlist.length) {
                        currentTrackIndex = savedIndex;
                    } else {
                         console.warn("Saved index out of bounds, defaulting to 0.");
                         currentTrackIndex = 0;
                    }

                    currentVolume = (typeof state.volume === 'number' && state.volume >= 0 && state.volume <= 1) ? state.volume : 1.0;
                    const savedMuted = typeof state.muted === 'boolean' ? state.muted : false;
                    audio.volume = currentVolume; // Apply volume
                    audio.muted = savedMuted;    // Apply mute state

                    isShuffle = typeof state.shuffle === 'boolean' ? state.shuffle : false;
                    repeatMode = ['none', 'one', 'all'].includes(state.repeat) ? state.repeat : 'none';

                    const savedRate = (typeof state.playbackRate === 'number' && state.playbackRate >= 0.5 && state.playbackRate <= 2) ? state.playbackRate : 1;
                    audio.playbackRate = savedRate;
                    playbackSpeedSelect.value = savedRate; // Update dropdown

                    // Load track metadata for the restored index
                    // Pass a flag to loadTrack to indicate it's an initial state load? (Optional)
                    loadTrack(currentTrackIndex); // Sets src, updates UI text/art

                    // Defer setting currentTime
                    const savedTime = (typeof state.time === 'number' && state.time > 0) ? state.time : 0;

                    const setInitialTime = () => {
                        if (!isNaN(audio.duration) && audio.duration > 0) {
                             if (savedTime < audio.duration) {
                                 audio.currentTime = savedTime;
                                 console.log(`Resumed track ${currentTrackIndex} at ${formatTime(savedTime)}`);
                             } else {
                                  console.warn(`Saved time ${savedTime} exceeds duration ${audio.duration}. Starting from 0.`);
                                  audio.currentTime = 0;
                             }
                             updateProgressBar(); // Update UI after setting time
                        } else {
                             console.warn(`Cannot resume time for track ${currentTrackIndex}: Invalid duration.`);
                        }
                         // Check if state implies we should resume playing (e.g., was playing when saved)
                         // We didn't explicitly save 'isPlaying', so maybe infer from time > 0? Or add it to saved state.
                         // For now, we won't auto-play on load. User must click play.
                         // stateLoadedRequiresPlay = savedTime > 0; // Basic inference
                    };

                    // Wait for metadata before setting time
                     if (audio.readyState >= 1) { // If metadata already available (less likely but possible)
                          setInitialTime();
                     } else {
                         audio.addEventListener('loadedmetadata', setInitialTime, { once: true });
                     }

                    successfullyLoadedState = true;

                } catch (error) {
                    console.error("Failed to parse/apply saved playback state:", error);
                    localStorage.removeItem('musicPlayerPlaybackState');
                    successfullyLoadedState = false; // Ensure fallback if parsing fails
                }
            } else {
                console.log("No saved playback state found.");
            }
        } else {
             console.log("Playlist is empty, cannot load playback state.");
        }

        // 3. Handle Fallback / Default Initialization
        if (!successfullyLoadedState) {
            if (playlistLoaded && playlist.length > 0) {
                 // Playlist loaded from storage, but no valid playback state found
                 console.log("Playlist loaded, starting from track 0.");
                 currentTrackIndex = 0;
                 loadTrack(currentTrackIndex); // Load track 0 info
            } else if (!playlistLoaded && !isReload) {
                 // Initial load, no saved playlist, render default list
                 console.log("No saved playlist, rendering default.");
                 renderPlaylist(); // Render the initial playlist array
                 if (playlist.length > 0 && playlist[0].src) {
                     currentTrackIndex = 0;
                     loadTrack(currentTrackIndex); // Load track 0 info
                 } else {
                     displayDefaultState(); // Show empty state
                 }
            } else if (!playlistLoaded && isReload){
                 // Triggered by load button, but loadPlaylist failed earlier
                 console.warn("Load button clicked, but playlist loading failed.");
                 displayDefaultState();
            } else {
                 // Playlist is likely empty (either loaded empty or default was empty)
                  console.log("Playlist is empty after load attempt.");
                 displayDefaultState();
            }
        }

        // 4. Final UI State Application (Volume, Controls)
        volumeBar.value = audio.muted ? 0 : (currentVolume * 100); // Reflect loaded/default volume & mute
        updateVolumeIcon();

        shuffleBtn.classList.toggle('active', isShuffle); // Reflect loaded/default shuffle
        shuffleBtn.title = isShuffle ? "Shuffle On" : "Shuffle Off";

        repeatBtn.classList.toggle('active', repeatMode !== 'none'); // Reflect loaded/default repeat
        repeatBtn.dataset.mode = repeatMode;
        repeatBtn.querySelector('i')?.classList.toggle('fa-1', repeatMode === 'one');
        // Adjust repeat button title based on mode
        switch (repeatMode) {
            case 'one': repeatBtn.title = "Repeat One"; break;
            case 'all': repeatBtn.title = "Repeat All"; break;
            default: repeatBtn.title = "Repeat Off";
        }

        // Ensure seek bar state reflects the loaded track (even if time is 0)
        // Use a small timeout to allow potential 'loadedmetadata' event to fire first
        setTimeout(() => {
            if (!isNaN(audio.duration) && audio.duration > 0) {
                seekBar.max = audio.duration;
                seekBar.disabled = false;
                updateProgressBar(); // Updates position and background
            } else {
                seekBar.disabled = true;
                updateSeekBarBackground(0);
            }
        }, 50); // Short delay


        console.log(`Player Initialized. ${successfullyLoadedState ? 'Restored' : 'Default'} state loaded.`);
        return successfullyLoadedState; // Return whether state was loaded
    }


    initializePlayer(); // Start the player setup on initial page load

});
