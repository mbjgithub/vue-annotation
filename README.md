目前进度：
  platforms/web/runtime/index 的mountComponent
  接下来看下patch具体是怎么给元素附加特性的，比如class，style，结合示例demo

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

			parent: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …}   //父组件实例
			propsData: {password: "123456",username: "aliarmo"}    //使用组件时候传下来到模板里面的数据
			_componentTag: "select2"
			_parentListeners: {input: ƒ}
			_parentVnode: VNode {tag: "vue-component-1-select2", data: {…}, children: undefined, text: undefined, elm: undefined, …}
			_renderChildren: [VNode]
			
		}
		$parent               //当前组件的父组件实例
		$refs                 //当前组件里面包含的dom引用
		$root                 //根组件实例
		$scopedSlots      
		$slots
		$vnode                 //组件被引用时候的那个vnode，比如<TestComps></TestComps>
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
		_vnode       //当前组件模板根元素所对应的vnode对象
		_watcher     //当前组件对象的watcher对象
    _watchers    //当前vm所拥有的watcher集合

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

证明下，如果在子孙组件改变祖先组件的state，会不会导致祖先组件的重新渲染，答案是肯定的，我这里之所以这么慢是因为bridge？
        编译        元素操作
模板语法======>vnode==========>真正UI元素

web平台props和attrs的区别：像innerHTML，textContent，innerText属于props，设置在元素上，如src，class，href，id，data-等属于attrs，attrs是用来描述标签特性的，只要是挂在在dom元素上都是props

备注：暂时不明白的地方用TODO标记，便于日后观看

VM原来一直指的是vnode.context

### 一个vnode对应一个dom元素，vnode.children代表的是该元素子dom的vnode结构
vnode：
  data:
    attrs,                      class,id,type,data-,placeholder等
    class,staticClass,
    style,staticStyle,
    props,                       value,innerHTML等
    domProps,
    on(数据结构：{click:fn1,hover:[fn2,fn3]}),
    transition,
    ref(当前组件所处上下文，也就是处于哪个自定义组件的模板中)(通用模块),
    directives(通用模块),        v-if,v-show,v-for,v-model,自定义指令
  elm:
  context:  当前vnode所在的父组件实例

  componentInstance(组件实例):   有这个值的表示是自定义组件，否则就是平台规定的标准元素

  componentOptions:{
    Ctor: ƒ VueComponent(options),
    children: undefined,
    listeners: undefined,
    propsData: {password: "123456", username: "aliarmo"},
    tag: "TestComp"
  }
  
  parent(父节点):       父vnode   

  children(子节点):     子vnode

  tag:当前组件根节点元素

  context(就是我们在组件内常用的this??):
    $refs

	Vue主要有模板编译、数据驱动(数据绑定)、vnode、patch四大块

1、所以vue core到底干了啥，提供了啥接口，功能
   (1)数据驱动，更新数据就会自动更新视图，只要做好绑定
   (2)通过vnode方式，递归生成指定平台视图，
   (3)更新视图时自动diff

2、接入vue core的平台有什么便利之处，如web，weex，hippy

3、平台如何接入vue core，如web，weex，hippy
  供core用vnode生成平台元素时候使用
    提供操作平台内置元素方法，如web平台，需要提供创建、查找和删除等操作元素方法
    提供操作平台内置元素属性（特性）方法，如web平台，需要提供class和style合并策略，事件绑定，属性等方法
  具体的平台需要定义一个自己的$mount方法给Vue，将当前组件所代表元素结构挂载到指定元素上
  如果有需要，可以定义些平台性的组件和指令，比如web平台，提供了v-model和v-show指令


Watcher,Observer,Dep三者的关系
        通知    通知
Observer====>Dep====>Watcher


总结：
1、为什么data，props里面不允许使用_和$开头的变量？
   因为data，props属性会被vm代理，可能会找出覆盖
   

看到Vue.prototype._render，给vm上挂在render-helper

```
<!-- 模板 -->
<div>
  <div class="Test" :class="username">
    {{username}}:{{password}}
  </div>
  <!-- 自定义组件的vnode上有componentInstance -->
  <TestComp :username="username"
            :password="password"></TestComp>
  <button @click="toggle">切换</button>
</div>
<!-- 这一段模板执行render之后得到的结果是 -->
<!-- 然后进行createElm的深度遍历 -->
{
  tag:'div',
  data:{
    attr:{},
    on:{},
    props:{}
  },
  children:[{
    tag:'div',
    data:{
      class:'shaniawei',
      staticClass:'Test'
    },
    children:[{
      tag:'',
      text:'aliarmo:11111',
      children:''
    }]
  },{
    tag:'',
    text:'     ',
  },{
    tag:'TestComp',
    data:{
      attr:{},
      hook:{
        init:fn,
        prepatch:fn,
        insert:fn,
        destroy:fn
      }
    },
    componentOptions:{
      _Ctor:继承自Vue的构造函数,
      propsData:{
        username:'shaniawei',
        passsword:'11111'
      },
      children:[],是组件的slot
      tag:'TestComps'
    },
    componentInstance:''
  },{
    tag:'',
    text:'     ',
  },{
    tag:'button',
    data:{
      attr:{},
      on:{
        click:事件处理函数
      }
    }
  }]
}
```

### Vue Watcher体系
#### 整个体系的建立过程
1、创建组件实例的时候会对data和props进行observer，
2、observer会遍历state对state所包含属性重新定义，即defineReactive，重新设定属性描述符的get和set
3、在mountComponent的时候，会new Wacther，当前watcher实例会被pushTarget，设定为目标watcher，然后执行vm._update(vm._render(), hydrating)，执行render函数导致属性的get函数被调用，每个属性会有一个dep实例，每个dep实例关联到组件对应的watcher，关联后popTarget。
4、如果有子组件，会导致子组件的实例化，重新执行上述步骤
#### state变动响应过程
1、当state变动后，调用属性描述符的set函数，dep会通知到关联的watcher进入到nextTick任务里面，这个watcher实例的run函数包含vm._update(vm._render(), hydrating)，执行这个run函数，导致重新生成vnode，进行patch，经过diff，达到更新UI目的
#### 总结：
1、一个组件对应一个观察者，在挂载组件的时候创建这个观察者，mountComponent
2、组件的state，包含data，props都是被观察者，被观察者的任何变化会被通知到观察者
3、被观察者的变动导致观察者执行的动作是vm._update(vm._render(), hydrating),组件重新render和patch