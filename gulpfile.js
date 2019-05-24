/**
 * Created by aegean on 2017/11/16.
 */

const gulp = require('gulp');
// 模块化打包，node系
const browserify = require('browserify');
// stream流，gulp系
const stream = require('vinyl-source-stream');
// 二进制流，gulp系
const buffer = require('vinyl-buffer');

let clean = require('gulp-clean');
let concat = require('gulp-concat');
let cssmin = require('gulp-cssmin');
let uglify = require('gulp-uglify');
let jshint = require('gulp-jshint');
let rename = require("gulp-rename");
let inject = require('gulp-inject-string');
let formatDate = require('format-date');

// jshint验证规则
let jshintCfg = require('./jshint-config.json');
// 获取package内容
let pkgJSON = require('./package.json');
// 项目信息配置
let targetDir = `dist/${pkgJSON.version}`;
let moduleName = 'AgImgDrawer';
let timeYMDHMS = formatDate('{year}/{month}/{day} {hours}:{minutes}:{seconds}', new Date());   //日期格式1
let timeYMDHM = formatDate('{year}/{month}/{day} {hours}:{minutes}', new Date());   //日期格式2
let descLine = `/*! ${pkgJSON.description} */`;
let bannerPartLine = `/*! ${moduleName} v${pkgJSON.version} | (c) ${pkgJSON.author} | Created on ${pkgJSON.createdTime} */`;
let concatBanner = `${bannerPartLine}\n${descLine}\n/*! Modified on ${timeYMDHMS} */\n\n`;
let uglifyBanner = `${bannerPartLine}\n${descLine}\n/*! Modified on ${timeYMDHM} */\n\n`;
let footerStr = `\n\n/*** That blue eyes exist in the aegean sea! ***/\n`;


// 压缩css
gulp.task('minCss', function () {
    gulp.src('src/main/*.css')
        .pipe(cssmin())
        .pipe(inject.prepend(uglifyBanner))
        .pipe(inject.append(footerStr))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}.min.css`))
        .pipe(gulp.dest(`${targetDir}/`));
});

// 压缩fabric.js
gulp.task('minLib', function () {
    return gulp.src(['./src/lib/fabric-2.3.2/fabric.js'])
        .pipe(uglify())
        .pipe(rename('fabric-custom.min.js'))
        .pipe(gulp.dest('./src/lib/fabric-2.3.2/'));
});

// 打包模块化文件
gulp.task('packJs_temp', function () {
    // 定义入口文件
    return browserify({
        entries: 'src/index.js',
        debug: true
    }).transform("babelify", {presets: ["@babel/preset-env"]})
        .bundle()
        .on('error', function (error) {
            console.log(error.toString())
        })
        .pipe(stream('index.js'))   // 转成gulp系的stream流
        .pipe(buffer())     // 转成二进制的流（二进制方式整体传输）
        .pipe(jshint(jshintCfg)).pipe(jshint.reporter('jshint-stylish'))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}-temp.js`))
        .pipe(gulp.dest(`${targetDir}/temp/`))  // 生成不压缩的临时代码
        .pipe(uglify())
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}-temp.min.js`))
        .pipe(gulp.dest(`${targetDir}/temp/`))   // 生成压缩的临时代码

});

gulp.task('packWithLib', ['packJs_temp'], function () {
    return gulp.src([`./${targetDir}/temp/${pkgJSON.name}-${pkgJSON.version}-temp.js`, './src/lib/fabric-2.3.2/fabric.js'])
        .pipe(concat('all.js'))
        .pipe(inject.prepend(concatBanner))
        .pipe(inject.append(footerStr))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}.js`))
        .pipe(gulp.dest(`${targetDir}/`));
});
// 合并压缩的临时js与依赖库
gulp.task('packWithLib_min', ['packJs_temp'], function () {
    return gulp.src([`./${targetDir}/temp/${pkgJSON.name}-${pkgJSON.version}-temp.min.js`, './src/lib/fabric-2.3.2/fabric-custom.min.js'])
        .pipe(concat('all.min.js'))
        .pipe(inject.prepend(uglifyBanner))
        .pipe(inject.append(footerStr))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}.min.js`))
        .pipe(gulp.dest(`${targetDir}/`));
});

// 拷贝资源等静态文件以及无需经过上述任务流处理的文件
gulp.task('copyStatic', function () {
    return gulp.src(['src/images/**'])
        .pipe(gulp.dest(`${targetDir}/images`));
});

// 移除临时文件
gulp.task('cleanTemp', ['packWithLib', 'packWithLib_min'], function () {
    // 返回 stream 本身表示它已经被完成
    return gulp.src(`${targetDir}/temp/**`, {read: false}).pipe(clean());
});


// 汇总任务
gulp.task('task_all', ['minCss', 'packJs_temp', 'packWithLib', 'packWithLib_min', 'copyStatic', 'cleanTemp']);

// 自动化构建
gulp.task('watch', ['task_all'], function () {
    gulp.watch('src/main/**', ['task_all']);
});

// 执行任务
gulp.task('default', ['task_all']);
