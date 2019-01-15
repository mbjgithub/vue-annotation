目前进度：platforms/web/runtime/index 的mountComponent

vm.$createElement 用于递归创建vnode

new Vue的时候，
	或提供el，
	或提供template，并$mount，
	或提供render函数，并$mount

一个Vue实例所拥有的
	属性
		$attrs
		$children
		$listeners
		$options: {
			components: {}
			data: ƒ mergedInstanceDataFn()
			directives: {}
			el: "#el"
			filters: {}
			provide: ƒ mergedInstanceDataFn()
			template: "#demo-template"
			_base: ƒ Vue(options)

			parent: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …}
			propsData: {value: 0, options: Array(2)}
			_componentTag: "select2"
			_parentListeners: {input: ƒ}
			_parentVnode: VNode {tag: "vue-component-1-select2", data: {…}, children: undefined, text: undefined, elm: undefined, …}
			_renderChildren: [VNode]
			
		}
		$parent
		$refs
		$root
		$scopedSlots
		$slots
		$vnode
		_directInactive
		_events
		_hasHookEvent
		_inactive
		_isBeingDestroyed
		_isDestroyed
		_isMounted
		_isVue
		_self
		_staticTrees
		_uid
		_vnode
		_watcher

	方法
		$createElement
		_c
		_renderProxy

	$data
	$isServer
	$props
	$ssrContext
	get $attrs 
	set $attrs 
	get $listeners 
	set $listeners

vue-loader 打包后的东西是这样的
	components: {IllegalPage: {…}, LeftMenu: {…}, NavigatorHeader: {…}, Toast: {…}, QRCodePop: {…}, …}
	computed: {sellerInfo: ƒ, permission: ƒ}
	created: ƒ created()
	data: ƒ data()
	inject: {}
	methods: {illegalConfirm: ƒ, onQRCodeCancel: ƒ, showTask: ƒ, showTool: ƒ, onClosePop: ƒ}
	render: ƒ ()
		//render函数张这样
		with(this){return _c('div',[_c('p',[_v("Selected: "+_s(selected))]),_v(" "),_c('select2',{attrs:{"options":options},model:{value:(selected),callback:function ($$v) {selected=$$v},expression:"selected"}},[_c('option',{attrs:{"disabled":"","value":"0"}},[_v("Select one")])]),_v(" "),_c('MyComp',{attrs:{"myData":myData,"title":"啦啦啦啦啦"}})],1)}
	staticRenderFns: []
	_Ctor: {0: ƒ}
	__file: "E:\vmall\manage\views\App.vue"

组件实例包含vnode实例

beforeCreated=》
created=》
beforeMount=》
	beforeCreated(子)=》
	created(子)=》
	beforeMount(子)=》
	mounted(子)=》
mounted

挂载的意思就是将元素append到已知dom上


初始创建视图：
new Vue()=>_init()
				给实例添加属性，createElement，生命周期beforeCreate，初始换状态props，data，computed，methods，data，watch并加上observe，生命周期created，可以看到现在还远远没有渲染视图
				然后$mount，开始视图渲染之路
				$mount()
					如果用户没有提供渲染函数，则将template compileToFunctions，得到$options上挂载的render和staticRenderFns
					然后到真正的mount
					mount()
						mountComponent()
							生命周期beforeMount，定义updateComponent，new Watcher
								new Watcher的调用会导致updateComponent的执行
									updateComponent()
										_render，获取vnode，其实里面调的就是render函数，_update里面调patch函数
										patch()
											主要调用createElm，这个函数根据vnode创建具体的HTML元素，如果有孩子节点，则递归createElm，如果遇到的是自定义的component，则就是要创建组件，组件对应的vnode上挂载有Ctor函数，new Ctor会重新回到最上层_init，利用组件的vnode，生成这个组件对应模板vnode，这个元素创建完成后会挂载到parent element下
									    然后依次回到updateComponent，依次执行生命周期mounted，这个时候虽然元素都挂载好了，但是都是初始数据渲染的，如果有异步接口，数据回来后触发数据更新，导致updateComponent的再次调用，进行dom更新
自此，new Vue完结---------------------------------------------------------------------									    

更新视图：
属性变动，执行microtask，执行变动组件的updateComponent，执行进而执行组件的render函数，重新生成vnode，执行update，执行patch，进而执行patchVnode



attrs: class,id,type,data-,placeholder等
props: value,innerHTML等


vnode的data上挂载有：{
	attrs,
	class,
	staticClass,
	domProps,
	on,
	style,
	staticStyle

}


directives:
	v-if
	v-show
	v-for
	v-model
	自定义指令


证明下，如果在子孙组件改变祖先组件的state，会不会导致祖先组件的重新渲染，答案是肯定的，我这里之所以这么慢是因为bridge？