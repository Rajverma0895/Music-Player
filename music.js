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

    // --- State Variables ---
    let playlist = [
        // --- Sample Initial Playlist ---
        // Add more sample tracks if you have local files ready
        // You can use relative paths if you create a 'music' folder
        // {
        //     title: "Sample Track 1",
        //     artist: "Unknown Artist",
        //     album: "Sample Album",
        //     src: "music/sample1.mp3", // Path to your local audio file
        //     cover: "placeholder.png" // Path to cover art (or keep placeholder)
        // },
        // {
        //     title: "Sample Track 2",
        //     artist: "Another Artist",
        //     album: "Sample Album",
        //     src: "music/sample2.mp3",
        //     cover: "placeholder.png"
        // }
        // --- If no samples, provide a default placeholder ---
         {
            title: "No Tracks Loaded",
            artist: "Add files using the folder icon",
            album: "",
            src: "", // Important: needs a valid src to avoid errors initially, even if empty
            cover: "placeholder.png"
         }
    ];
    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = 'none'; // 'none', 'one', 'all'
    let currentVolume = 1.0;
    let isSeeking = false; // Flag to prevent UI flicker during seek

    // --- Core Functions ---

    function loadTrack(index) {
        if (index < 0 || index >= playlist.length || !playlist[index].src) {
             console.error("Invalid track index or source:", index, playlist[index]);
            // Handle empty playlist or invalid track - maybe show default state
            if(playlist.length === 0 || !playlist[0].src) {
                 displayDefaultState();
            }
            return; // Exit if track is invalid or source is missing
        }

        const track = playlist[index];
        currentTrackIndex = index; // Update the global index

        songTitleEl.textContent = track.title || "Unknown Title";
        songArtistEl.textContent = track.artist || "Unknown Artist";
        songAlbumEl.textContent = track.album || ""; // Show album if available
        albumArt.src = track.cover || 'placeholder.png'; // Use placeholder if no cover
        albumArt.onerror = () => { albumArt.src = 'placeholder.png'; }; // Fallback on image load error

        // Reset times and seek bar before loading new source
        currentTimeEl.textContent = formatTime(0);
        totalDurationEl.textContent = formatTime(0);
        updateSeekBarBackground(0); // Reset background visually
        seekBar.value = 0;
        seekBar.disabled = true; // Disable seek bar until duration is known

        // Load the audio source *after* updating UI elements
        audio.src = track.src;
        // console.log("Loading track:", track.src); // Debugging

         // Reset play state visually (important if previous track ended)
         setPlayIcon(false);
         musicPlayer.classList.remove('playing');

        // Once metadata is loaded, update duration and enable seek bar
        audio.onloadedmetadata = () => {
            // console.log("Metadata loaded, duration:", audio.duration); // Debugging
            totalDurationEl.textContent = formatTime(audio.duration);
            seekBar.max = audio.duration; // Set max based on actual duration
             seekBar.disabled = false; // Enable seek bar
             updateSeekBarBackground(audio.currentTime / audio.duration * 100); // Update for initial load
        };

         // Handle potential loading errors
         audio.onerror = (e) => {
             console.error("Error loading audio:", audio.error);
             songTitleEl.textContent = "Error Loading Track";
             songArtistEl.textContent = track.title || "File may be corrupt or unsupported";
             songAlbumEl.textContent = "";
             albumArt.src = 'placeholder.png';
             totalDurationEl.textContent = "0:00";
             seekBar.disabled = true;
             setPlayIcon(false);
             musicPlayer.classList.remove('playing');
             // Maybe try loading next track automatically?
             // setTimeout(playNext, 1000); // Example: try next after 1 sec delay
         };

        highlightCurrentTrack();
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
        setPlayIcon(false);
        musicPlayer.classList.remove('playing');
        // Clear playlist UI if needed, or show a placeholder message
        // playlistEl.innerHTML = '<li>No tracks loaded.</li>';
    }

    function playTrack() {
        if (!audio.src || audio.readyState < 2) { // Check if src is set and ready enough
           console.warn("Audio not ready or no source.");
           // If it's the first load and src is empty, maybe load the first track?
           if (!audio.src && playlist.length > 0 && playlist[0].src) {
               loadTrack(0);
                // Try playing again after a short delay to allow loading
               setTimeout(() => {
                    if (audio.readyState >= 2) audio.play().catch(handlePlayError);
               }, 100);
           }
           return;
        }

        audio.play().then(() => {
            isPlaying = true;
            setPlayIcon(true);
            musicPlayer.classList.add('playing'); // For potential animations (like equalizer)
            // console.log("Playing track"); // Debugging
        }).catch(handlePlayError);
    }

    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        setPlayIcon(false);
        musicPlayer.classList.remove('playing');
        // console.log("Paused track"); // Debugging
    }

     function handlePlayError(error) {
          console.error("Play failed:", error);
          isPlaying = false;
          setPlayIcon(false);
          musicPlayer.classList.remove('playing');
          // Maybe display a user message?
          songArtistEl.textContent = "Playback failed. Try another track.";
     }

    function setPlayIcon(playing) {
        if (playing) {
            playPauseIcon.classList.remove('fa-play');
            playPauseIcon.classList.add('fa-pause');
            playPauseBtn.title = "Pause";
        } else {
            playPauseIcon.classList.remove('fa-pause');
            playPauseIcon.classList.add('fa-play');
            playPauseBtn.title = "Play";
        }
    }

    function playNext() {
         if (playlist.length === 0) return;

        let nextIndex;
        if (isShuffle) {
            // Simple shuffle: pick a random index different from the current one
            if (playlist.length <= 1) {
                nextIndex = 0; // Only one track, just restart if needed
            } else {
                 do {
                     nextIndex = Math.floor(Math.random() * playlist.length);
                 } while (nextIndex === currentTrackIndex);
            }
        } else {
             nextIndex = (currentTrackIndex + 1) % playlist.length;
        }

        loadTrack(nextIndex);
        playTrack();
    }

    function playPrev() {
        if (playlist.length === 0) return;

        let prevIndex;
        if (isShuffle) {
             // Shuffle on previous? Could just play another random one or implement history
            if (playlist.length <= 1) {
                prevIndex = 0;
            } else {
                do {
                    prevIndex = Math.floor(Math.random() * playlist.length);
                } while (prevIndex === currentTrackIndex);
            }
        } else {
            prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        }

        loadTrack(prevIndex);
        playTrack();
    }

    function updateProgressBar() {
        if (isNaN(audio.duration) || !isFinite(audio.duration) || audio.duration <= 0 || isSeeking) return; // Avoid NaN/Infinity issues and updates during drag

        const progressPercent = (audio.currentTime / audio.duration) * 100;
        seekBar.value = audio.currentTime; // Update slider position directly
        currentTimeEl.textContent = formatTime(audio.currentTime);

        updateSeekBarBackground(progressPercent); // Update visual fill
    }

     function updateSeekBarBackground(percent) {
          // Ensure percent is within 0-100 range
          const clampedPercent = Math.max(0, Math.min(100, percent));
          // Dynamically set the background gradient
          // Need to get the actual colors from CSS variables for theme consistency
          const progressFill = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color'); // Or your gradient
          const progressBg = getComputedStyle(document.documentElement).getPropertyValue('--progress-bg');
          seekBar.style.background = `linear-gradient(to right, ${progressFill} ${clampedPercent}%, ${progressBg} ${clampedPercent}%)`;
     }


    function seek(e) {
         if (isNaN(audio.duration) || audio.duration <= 0) return; // Can't seek if duration unknown/invalid
        audio.currentTime = parseFloat(e.target.value); // Use parseFloat for potentially finer control
        // updateProgressBar(); // Update immediately for better feedback while dragging
    }

     function startSeek() {
         isSeeking = true;
     }

     function endSeek() {
          isSeeking = false;
          // Final update after seeking stops
          if (!isNaN(audio.duration) && audio.duration > 0) {
             audio.currentTime = parseFloat(seekBar.value);
              if (isPlaying) {
                  // If the track was paused due to seeking finish, resume play
                  if(audio.paused) {
                       audio.play().catch(handlePlayError);
                  }
              }
          }
          updateProgressBar(); // Update UI elements after seek action
     }


    function setVolume(e) {
        currentVolume = e.target.value / 100;
        audio.volume = currentVolume;
        updateVolumeIcon();
    }

    function updateVolumeIcon() {
        if (audio.volume === 0 || audio.muted) {
            volumeIcon.classList.remove('fa-volume-high', 'fa-volume-low');
            volumeIcon.classList.add('fa-volume-mute');
        } else if (audio.volume < 0.5) {
            volumeIcon.classList.remove('fa-volume-high', 'fa-volume-mute');
            volumeIcon.classList.add('fa-volume-low');
        } else {
            volumeIcon.classList.remove('fa-volume-low', 'fa-volume-mute');
            volumeIcon.classList.add('fa-volume-high');
        }
    }

    function toggleMute() {
        if (audio.muted) {
            audio.muted = false;
            volumeBar.value = currentVolume * 100; // Restore slider to pre-mute level
        } else {
            audio.muted = true;
            // Don't necessarily reset currentVolume here, just mute
            volumeBar.value = 0; // Set slider to 0 visually
        }
        updateVolumeIcon();
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
        shuffleBtn.title = isShuffle ? "Shuffle On" : "Shuffle Off";
        // console.log("Shuffle:", isShuffle); // Debugging
    }

    function toggleRepeat() {
        switch (repeatMode) {
            case 'none':
                repeatMode = 'all';
                repeatBtn.classList.add('active');
                // Optional: Change icon or add indicator for 'all'
                repeatBtn.title = "Repeat All";
                repeatBtn.dataset.mode = 'all'; // For potential specific styling
                break;
            case 'all':
                repeatMode = 'one';
                repeatBtn.classList.add('active'); // Stays active
                 // Optional: Change icon or add indicator for 'one' (e.g., 'fa-repeat-1')
                repeatBtn.querySelector('i').classList.add('fa-1'); // Example using FontAwesome number overlay
                repeatBtn.title = "Repeat One";
                repeatBtn.dataset.mode = 'one';
                break;
            case 'one':
                repeatMode = 'none';
                repeatBtn.classList.remove('active');
                repeatBtn.querySelector('i').classList.remove('fa-1');
                repeatBtn.title = "Repeat Off";
                 repeatBtn.dataset.mode = 'none';
                break;
        }
         // console.log("Repeat Mode:", repeatMode); // Debugging
    }

    function handleTrackEnd() {
        // console.log("Track ended. Repeat mode:", repeatMode); // Debugging
        if (repeatMode === 'one') {
            audio.currentTime = 0; // Reset time
            playTrack(); // Play the same track again
        } else if (repeatMode === 'all' || (repeatMode === 'none' && currentTrackIndex < playlist.length - 1) || isShuffle) {
            // Play next if repeat all is on,
            // OR if repeat is off BUT it's not the last track,
            // OR if shuffle is on
            playNext();
        } else {
            // Repeat is 'none' and it was the last track (and shuffle is off)
            isPlaying = false;
            setPlayIcon(false);
            musicPlayer.classList.remove('playing');
            audio.currentTime = 0; // Reset time to beginning
            seekBar.value = 0; // Reset seek bar visually
            updateSeekBarBackground(0);
             // Optional: highlight first track again? Or do nothing.
             // highlightCurrentTrack(); // Re-highlights the ended track
        }
    }

    // --- Playlist Management ---

    function renderPlaylist() {
        playlistEl.innerHTML = ''; // Clear existing list
        if (playlist.length === 0 || !playlist[0].src ) { // Check if placeholder is the only item
             playlistEl.innerHTML = '<li>No tracks loaded. Add files.</li>';
             displayDefaultState(); // Ensure main UI shows default state too
             return;
        }

        playlist.forEach((track, index) => {
            const li = document.createElement('li');
            li.textContent = `${track.title || 'Unknown Title'} - ${track.artist || 'Unknown Artist'}`;
            li.dataset.index = index; // Store index for easy access
            li.addEventListener('click', () => {
                loadTrack(index);
                playTrack();
            });
            playlistEl.appendChild(li);
        });
        highlightCurrentTrack(); // Highlight after rendering
    }

    function highlightCurrentTrack() {
        const listItems = playlistEl.querySelectorAll('li');
        listItems.forEach((item, index) => {
            if (index === currentTrackIndex) {
                item.classList.add('active');
                // Optional: Scroll the active item into view
                 item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

     function addTracksToPlaylist(files) {
         let firstNewTrackIndex = -1;
         // Remove placeholder if it exists and we are adding real files
          if (playlist.length === 1 && !playlist[0].src) {
               playlist = []; // Clear the placeholder
               currentTrackIndex = 0; // Reset index
          }

         for (const file of files) {
             if (file.type.startsWith('audio/')) {
                 // Basic metadata extraction from filename (can be improved with libraries)
                 let title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                 let artist = "Unknown Artist"; // Default
                 // Very basic attempt to split by " - "
                 if (title.includes(' - ')) {
                     const parts = title.split(' - ');
                     artist = parts[0].trim();
                     title = parts.slice(1).join(' - ').trim(); // Join back if title had '-'
                 }

                 const newTrack = {
                     title: title,
                     artist: artist,
                     album: "Local File", // Or try more advanced parsing if needed
                     src: URL.createObjectURL(file), // Create temporary URL
                     cover: 'placeholder.png', // No cover from local file easily
                     fileRef: file // Optional: keep reference to original file if needed later
                 };
                 playlist.push(newTrack);
                  if (firstNewTrackIndex === -1) {
                     firstNewTrackIndex = playlist.length - 1; // Mark index of the first added track
                 }
             }
         }
          renderPlaylist(); // Update the UI list

          // Optional: Load and play the first *newly* added track
           if (firstNewTrackIndex !== -1 && !isPlaying) {
              loadTrack(firstNewTrackIndex);
              // Optionally auto-play: playTrack();
           } else if (playlist.length > 0 && !audio.src) {
                // If player was empty before, load the first track overall
                loadTrack(0);
           }
     }


    // --- Theme Toggling ---

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeIcon.classList.remove(isDarkMode ? 'fa-sun' : 'fa-moon');
        themeIcon.classList.add(isDarkMode ? 'fa-moon' : 'fa-sun');
        localStorage.setItem('musicPlayerTheme', isDarkMode ? 'dark' : 'light');
        // Update seek bar background gradient as colors change
        updateSeekBarBackground(audio.currentTime / audio.duration * 100);
    }

    function loadThemePreference() {
        const savedTheme = localStorage.getItem('musicPlayerTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
             themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
             document.body.classList.remove('dark-mode');
             themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    // --- Utility Functions ---

    function formatTime(seconds) {
         if (isNaN(seconds) || seconds < 0) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --- Event Listeners ---
    playPauseBtn.addEventListener('click', () => isPlaying ? pauseTrack() : playTrack());
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);

    audio.addEventListener('timeupdate', updateProgressBar);
    audio.addEventListener('ended', handleTrackEnd);

    seekBar.addEventListener('input', updateProgressBar); // Update visuals while dragging
    seekBar.addEventListener('mousedown', startSeek); // Flag start of seek interaction
    seekBar.addEventListener('touchstart', startSeek, { passive: true }); // For touch devices
    seekBar.addEventListener('change', endSeek); // Set time when dragging finishes
    seekBar.addEventListener('mouseup', endSeek);
    seekBar.addEventListener('touchend', endSeek, { passive: true });

    volumeBar.addEventListener('input', setVolume);
    volumeIcon.addEventListener('click', toggleMute);

    themeToggleBtn.addEventListener('click', toggleTheme);

    addFilesBtn.addEventListener('click', () => fileInput.click()); // Trigger hidden input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            addTracksToPlaylist(e.target.files);
            // Clear the input value to allow adding the same file again if needed
            e.target.value = null;
        }
    });


    // --- Initialization ---
    function initializePlayer() {
        loadThemePreference(); // Apply saved theme first
        renderPlaylist(); // Build the initial playlist UI
         // Load the first track, but don't auto-play unless specified
         if (playlist.length > 0 && playlist[0].src) {
            loadTrack(currentTrackIndex);
         } else {
             displayDefaultState(); // Show default if playlist is empty or has no src
         }
        // Set initial volume display
        audio.volume = currentVolume;
        volumeBar.value = currentVolume * 100;
        updateVolumeIcon();
        // Set initial state for shuffle/repeat buttons
         shuffleBtn.classList.toggle('active', isShuffle);
         repeatBtn.classList.toggle('active', repeatMode !== 'none');
         if(repeatMode === 'one') repeatBtn.querySelector('i').classList.add('fa-1');
         updateSeekBarBackground(0); // Ensure initial bar background is correct
    }

    initializePlayer(); // Start the player setup
});