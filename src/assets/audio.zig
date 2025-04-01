// audio.zig
// Embeds audio assets into the WASM binary

const std = @import("std");

// Embed audio files as byte arrays
pub const enemy_hit = @embedFile("audio/enemy-hit.ogg");
pub const level_complete = @embedFile("audio/level-complete.ogg");
pub const level_fail = @embedFile("audio/level-fail.ogg");
pub const tower_shoot = @embedFile("audio/tower-shoot.ogg");
pub const enemy_explosion = @embedFile("audio/enemy-explosion.ogg");

// We no longer export these functions directly from this file
// They are now exported from main.zig to avoid symbol collision
