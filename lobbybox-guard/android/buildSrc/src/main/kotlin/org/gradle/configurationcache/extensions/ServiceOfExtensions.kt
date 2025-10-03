package org.gradle.configurationcache.extensions

import org.gradle.api.Project
import org.gradle.api.initialization.Settings
import org.gradle.api.invocation.Gradle
import org.gradle.api.internal.GradleInternal
import org.gradle.api.internal.project.ProjectInternal

inline fun <reified T : Any> Project.serviceOf(): T =
    serviceOf(T::class.java)

fun <T : Any> Project.serviceOf(serviceType: Class<T>): T =
    (this as ProjectInternal).services.get(serviceType)

inline fun <reified T : Any> Settings.serviceOf(): T =
    serviceOf(T::class.java)

fun <T : Any> Settings.serviceOf(serviceType: Class<T>): T =
    gradle.serviceOf(serviceType)

inline fun <reified T : Any> Gradle.serviceOf(): T =
    serviceOf(T::class.java)

fun <T : Any> Gradle.serviceOf(serviceType: Class<T>): T =
    (this as GradleInternal).services.get(serviceType)
