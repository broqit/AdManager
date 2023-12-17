var gulp = require('gulp');
var watch = require('gulp-watch');
var requirejs = require('requirejs');
var pkg = require('./package.json');

var rjs = function (name, out, optimize) {
    var ext = optimize ? '.min.js' : '.js',
        banner = '/*!\n' +
            ' * ' + pkg.name + ' - ' + pkg.description + '\n' +
            ' *\n' +
            ' * @author ' + pkg.authors[0].name + ' - ' + pkg.authors[0].url + '\n' +
            ' * @see ' + pkg.homepage + '\n' +
            ' * @version ' + pkg.version + '\n' +
            ' */';
    return new Promise((resolve, reject) => {
        requirejs.optimize({
            name: name,
            out: out + ext,
            optimize: (optimize ? 'uglify2' : 'none'),
            wrap: {
                start: banner
            }
        }, function(result) {
            resolve(result);
        }, function(error) {
            reject(error);
        });
    });
};

gulp.task('js', function() {
    return Promise.all([
        rjs('./src/Index', './dist/AdManager', false),
        rjs('./src/Index', './dist/AdManager', true)
    ]);
});

gulp.task('watch', function() {
    return watch('src/*.js', gulp.series('js'));
});

gulp.task('default', gulp.series('js', 'watch'));