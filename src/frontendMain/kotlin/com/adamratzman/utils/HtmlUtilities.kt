package com.adamratzman.utils

import com.adamratzman.database.SiteState
import com.adamratzman.database.isDevServer
import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.dom.removeClass
import org.w3c.dom.asList
import org.w3c.dom.url.URLSearchParams
import io.kvision.core.*
import io.kvision.form.check.CheckBox
import io.kvision.html.Tag
import io.kvision.html.link
import io.kvision.html.textNode

fun CheckBox.removeAbcCheckbox() {
    removeCssClass("abc-checkbox")
}

fun Component.addUikitAttributes(vararg attributes: Any) {
    attributes.forEach { setAttribute(it.toString(), "") }
}

fun Component.addAttributes(vararg attributePairs: Pair<Any, Any?>) {
    attributePairs.forEach { setAttribute(it.first.toString(), it.second?.toString() ?: "") }
}

fun Component.addCssClasses(vararg classes: Any) {
    classes.forEach { addCssClass(it.toString()) }
}

fun nameSetOf(vararg name: Any) = name.map { it.toString() }.toSet()

fun String.prependSpace() = " $this"

fun String.toDevOrProdUrl() = if (isDevServer) "/#!$this" else this
    .replace("url.adamratzman.com", "adamratzman.com")
    .replace("projects.adamratzman.com", "adamratzman.com")

fun getRandomColor() = Color.name(Col.values().random())

fun Container.textWithLinkedIcon(textBefore: String, link: String, iconName: String, ratio: Number) {
    +"$textBefore "
    link(label = "", url = link) {
        addAttributes("uk-icon" to "icon: $iconName; ratio: $ratio")
    }
}

fun Container.addLineBreak() {
    textNode("<br/>", rich = true)
}

fun Tag.noBorderRounding() {
    addCssClass("no-rounded-border")
}

fun Widget.unfocus() {
    hide()
    show()
}

fun removeLoadingSpinner(state: SiteState) {
    state.loadingDiv?.hide()
}

fun showLoadingSpinner(state: SiteState) {
    state.loadingDiv?.show()
}

fun getSearchParams() = URLSearchParams(if (!window.location.search.isBlank()) window.location.search  else window.location.hash.substringAfter("?"))

/*
window.matchMedia("only screen and (max-width: 760px)").matches;
 */

fun isMobile() = window.matchMedia("only screen and (max-width: 760px)").matches

fun fixDropdownMobile() {
    document.getElementsByClassName("dropdown-item").asList().forEach { dropdownItem ->
        dropdownItem.removeAttribute("href")
    }
}

fun Container.selectOuterContainerIfMobile(mobileContainer: Container, desktopContainer: Container, inner: Container.() -> Unit) {
    add(
        if (isMobile()) mobileContainer.apply(inner)
        else desktopContainer.apply(inner)
    )
}

fun addIconsToFasElements() {
    document.getElementsByClassName("fas").asList().forEach { element ->
        element.classList.asList().filter { it.startsWith("icon-") }
            .map { element.removeClass(it); it.removePrefix("icon-") }
            .forEach { uikitIconName -> element.setAttribute("uk-icon", "icon: $uikitIconName;") }
    }
}