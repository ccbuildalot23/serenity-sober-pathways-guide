# Audio Assets for Serenity ASMR Features

This directory should contain the following audio files for the ambient sound player:

## Nature Sounds
- `rain.mp3` - Gentle rainfall (10-15 minutes loop)
- `ocean.mp3` - Ocean waves (10-15 minutes loop)
- `forest.mp3` - Forest ambience with birds and wind (10-15 minutes loop)
- `birds.mp3` - Morning bird songs (10-15 minutes loop)

## Noise Options
- `white-noise.mp3` - White noise (10 minutes loop)
- `brown-noise.mp3` - Brown noise (10 minutes loop)  
- `pink-noise.mp3` - Pink noise (10 minutes loop)

## Ambient Sounds
- `meditation.mp3` - Meditation bowl/singing bowl (10-15 minutes loop)
- `chimes.mp3` - Wind chimes (10-15 minutes loop)

## Notification Sounds (Short, 1-3 seconds)
- `soft-chime.mp3` - Gentle notification chime
- `gentle-bell.mp3` - Soft bell sound
- `completion.mp3` - Success/completion sound
- `transition.mp3` - Page transition sound

## Audio Specifications
- Format: MP3 or OGG (MP3 preferred for wider compatibility)
- Quality: 128-192 kbps (balance between quality and file size)
- Volume: Normalized to prevent jarring loud sounds
- Loops: Should loop seamlessly without gaps
- Duration: 10-15 minutes for ambient sounds to minimize loading

## Licensing
All audio files should be royalty-free or properly licensed for use in a healthcare application.

## Fallback
If audio files are not available, the system will gracefully degrade:
- Procedural white noise generation for basic noise
- Silent operation with visual-only feedback
- All features remain optional and user-controlled