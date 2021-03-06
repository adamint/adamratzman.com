package com.adamratzman.utils

infix fun <T> T.plusList(list: List<T>) = listOf(this) + list

fun String.asDuplicatedPair() = this to this

fun String.removeAllMatchedSubstrings(vararg substrings: String):String {
    var result = this
    substrings.forEach { result = result.replace(it, "") }
    return result
}