// GENERATED FILE - DO NOT EDIT.
// Source: design-tokens/tokens.json
// Regenerate: node design-tokens/generate.mjs
// Consumed by the ALU TRACK PDA application (docs/24-pda-screens.md).

package com.redmind.alutrack.ui.theme

import androidx.compose.ui.graphics.Color

object AluTrackPalette {
    val Graphite0 = Color(0xFFFFFFFF)
    val Graphite25 = Color(0xFFFBFCFD)
    val Graphite50 = Color(0xFFF6F8FA)
    val Graphite100 = Color(0xFFEDF0F4)
    val Graphite200 = Color(0xFFDDE3EA)
    val Graphite300 = Color(0xFFC3CCD8)
    val Graphite400 = Color(0xFF9AA7B8)
    val Graphite500 = Color(0xFF647183)
    val Graphite600 = Color(0xFF536074)
    val Graphite700 = Color(0xFF3D4859)
    val Graphite800 = Color(0xFF2A3342)
    val Graphite900 = Color(0xFF1B2230)
    val Graphite950 = Color(0xFF11161F)
    val Anodic50 = Color(0xFFEEF4FB)
    val Anodic100 = Color(0xFFD8E6F6)
    val Anodic200 = Color(0xFFB3CDEC)
    val Anodic300 = Color(0xFF7FAADE)
    val Anodic400 = Color(0xFF4A84CB)
    val Anodic500 = Color(0xFF2A66B3)
    val Anodic600 = Color(0xFF1E5196)
    val Anodic700 = Color(0xFF184179)
    val Anodic800 = Color(0xFF143560)
    val Anodic900 = Color(0xFF112B4D)
}

data class StatusToken(
    val key: String,
    val label: String,
    val fg: Color,
    val surface: Color,
    val border: Color,
    val dot: Color,
)

object AluTrackStatus {
    val tokens: Map<String, StatusToken> = mapOf(
        "at-collection" to StatusToken("at-collection", "At Collection Point", Color(0xFF536074), Color(0xFFEDF0F4), Color(0xFFDDE3EA), Color(0xFF9AA7B8)),
        "stored" to StatusToken("stored", "Stored", Color(0xFF3D4859), Color(0xFFF6F8FA), Color(0xFFDDE3EA), Color(0xFF647183)),
        "in-movement" to StatusToken("in-movement", "In Movement", Color(0xFFB45309), Color(0xFFFFFAEB), Color(0xFFFEDF89), Color(0xFFB45309)),
        "staged" to StatusToken("staged", "Staged for Dispatch", Color(0xFF0E7490), Color(0xFFECFEFF), Color(0xFFA5F0FC), Color(0xFF0E7490)),
        "dispatched" to StatusToken("dispatched", "Dispatched", Color(0xFF15803D), Color(0xFFECFDF3), Color(0xFFABEFC6), Color(0xFF15803D)),
        "on-hold" to StatusToken("on-hold", "On Hold", Color(0xFFC2410C), Color(0xFFFFF7ED), Color(0xFFFED7AA), Color(0xFFC2410C)),
        "damaged" to StatusToken("damaged", "Damaged", Color(0xFFB42318), Color(0xFFFEF3F2), Color(0xFFFECDCA), Color(0xFFB42318)),
        "exception" to StatusToken("exception", "Exception", Color(0xFFB42318), Color(0xFFFEF3F2), Color(0xFFFECDCA), Color(0xFFB42318)),
    )
}
