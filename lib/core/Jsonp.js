import { noop, defineEnumerable, euc } from '../utils/index.js'

const defaultOptions = {
  timeout: 6000,
  prefix: 'callback',
  callbackParams: 'jsonpCallback',
  urlParams: {}
}

export default class Jsonp {
  // constructor (options) {
  //   this.checkOptions(options)

  //   this.initState(options)

  //   this.encodeURL(this._options.url)

  //   this.insertToElement(this._url)

  //   // Once invoked window[this._jsonpCallback], it will clean script which is
  //   // used to JSONP from HTML
  // }

  checkOptions (options) {
    if (!options.url) throw new Error('Please check your request url.')
    // if (!options.callback) throw new Error('Please check your callback parameter.')

    this._options = options
  }

  generateJsonpCallback (options) {
    if (options.jsonpCallback) {
      this._jsonpCallback = options.jsonpCallback
    } else {
      // prefix for callback name in global env
      const prefix = options.prefix || defaultOptions.prefix

      // unique global callback name in global env
      this._jsonpCallback = prefix + Date.now()
    }
  }

  defineGlobalCallback () {
    /**
     * 1. Once invoked window[this._jsonpCallback], it will clean timer for limiting
     *    request period and script element which is used to JSONP.
     * 2. use arrow function to define `this` object value (Jsonp instance).
     */
    return new Promise((resolve, reject) => {
      window[this._jsonpCallback] = (data) => {
        this.cleanScript()
        resolve(data)
      }
    })
  }

  generateTimer (options) {
    // limit request period
    const timeout = options.timeout || defaultOptions.timeout

    // use arrow function to define `this` object value.
    if (timeout) {
      this._timer = setTimeout(() => {
        window[this._jsonpCallback] = noop
        this._timer = null
        this.cleanScript()
        throw new Error('JSONP request unsuccessfully (eg.timeout or wrong url).')
      }, timeout)
    }
  }

  initState (options) {
    defineEnumerable(this, '_timer', null)
    defineEnumerable(this, '_url', null)
    defineEnumerable(this, '_jsonpCallback', null)
    defineEnumerable(this, '_insertScript', null)
    defineEnumerable(this, '_target', null)

    this.generateJsonpCallback(options)

    this.generateTimer(options)
  }

  encodeURL (url) {
    // name of query parameter to specify the callback name
    // eg. ?callback=...
    const callbackParams = this._options.callbackParams || defaultOptions.callbackParams
    const id = euc(this._jsonpCallback)
    url += `${url.indexOf('?') < 0 ? '?' : '&'}${callbackParams}=${id}`

    //  add other parameter to url excluding callback parameter
    const params = this._options.urlParams || defaultOptions.urlParams
    const keys = Object.keys(params)
    keys.forEach(key => {
      const value = params[key] !== undefined ? params[key] : ''
      url += `&${key}=${euc(value)}`
    })

    this._url = url
  }

  insertToElement (url) {
    this._target = document.getElementsByTagName('script')[0] || document.body.lastElementChild

    this._insertScript = document.createElement('script')
    this._insertScript.src = url

    // activate JSONP
    this._target.parentNode.insertBefore(this._insertScript, this._target)
  }

  cleanScript () {
    if (this._insertScript.parentNode) {
      this._target.parentNode.removeChild(this._insertScript)
      this._insertScript = null
    }

    window[this._jsonpCallback] = noop

    if (this._timer) clearTimeout(this._timer)
  }
}