package com.adamratzman.layouts.projects.spotify

import com.adamratzman.database.View.SpotifyCategoryViewPage
import com.adamratzman.layouts.SiteStatefulComponent
import com.adamratzman.security.guardValidSpotifyApi
import com.adamratzman.layouts.projects.goBackToProjectHome
import com.adamratzman.utils.UikitName.*
import com.adamratzman.utils.nameSetOf
import com.adamratzman.utils.removeLoadingSpinner
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import io.kvision.core.Container
import io.kvision.html.*

lateinit var allGenres: List<String>

class SpotifyGenreListComponent(parent: Container) : SiteStatefulComponent(parent = parent, buildStatefulComponent = { state ->
    guardValidSpotifyApi(state) { api ->
        div(classes = nameSetOf(MarginMediumTop, MarginMediumBottom)) {
            div(classes = nameSetOf(WidthTwoThirds, MarginAuto)) {
                h2(content = "Spotify Genre List", classes = nameSetOf(MarginRemoveBottom, "moderate-bold"))
                goBackToProjectHome()

                p(
                    content = "Note: some genre links may not work. Spotify only maintains a subset of genre pages on its website.",
                    classes = nameSetOf(MarginMediumTop)
                )

                GlobalScope.launch {
                    if (!::allGenres.isInitialized) allGenres = api.browse.getAvailableGenreSeeds()

                    ul {
                        allGenres.forEach { genre ->
                            li(classes = nameSetOf("rem-1-2")) {
                                link(
                                    label = genre,
                                    url = SpotifyCategoryViewPage(genre).devOrProdUrl(),//"https://open.spotify.com/genre/${genre.replace("-", "")}-page",
                                    classes = nameSetOf("link-color")
                                )
                            }
                        }
                    }

                    removeLoadingSpinner(state)
                }
            }
        }

    }
})