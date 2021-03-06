package com.adamratzman.layouts.partials

import com.adamratzman.layouts.SiteStatefulComponent
import com.adamratzman.utils.UikitName.*
import com.adamratzman.utils.nameSetOf
import io.kvision.core.Container
import io.kvision.html.bold
import io.kvision.html.div
import io.kvision.html.h3
import io.kvision.html.h4

class TechnicalSkillsComponent(parent: Container) : SiteStatefulComponent(parent = parent, buildStatefulComponent = {
    div(classes = nameSetOf(MarginMediumBottom.asString)) {
        id = "technical-skills"

        h3(content = "Technical Skills", classes = nameSetOf("bold", "solid-border-sm", MarginSmallBottom))

        listOf(
            "Languages and Markup" to "Kotlin, Java, C#, JavaScript, SQL",
            "Databases" to "RethinkDB, MySQL",
            "Web development" to "HTML, CSS, Kotlin/JS (KVision), UIKit, jQuery, Handlebars.js, Mustache/Handlebars.js, JSP, Spring Boot",
            "Development Tools" to "Git, Gradle, Docker, Docker Compose, Kubernetes, Service Fabric, Maven"
        ).forEach { pair ->
            val section = pair.first
            val skillsInSection = pair.second

            h4(classes = nameSetOf(MarginRemoveVertical.asString)) {
                bold("$section:")
                +" $skillsInSection"
            }
        }
    }
})