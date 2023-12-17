var gulp = require('gulp');
var watch = require('gulp-watch');
var browserify = require('browserify');
var source = require('vinyl-source-stream');

gulp.task('js', function() {
    return browserify('./src/AdManager.js') // вхідний файл
        .bundle()
        .pipe(source('AdManager.js')) // вихідний файл
        .pipe(gulp.dest('./dist')); // директорія виходу
});

gulp.task('watch', function() {
    gulp.watch('./src/*.js', ['js']);
});

gulp.task('default', ['js', 'watch']);