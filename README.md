目前进度：
  platforms/web/runtime/index 的mountComponent
  接下来看下patch具体是怎么给元素附加特性的，比如class，style，结合示例demo
  接下来看compile下的parser下的html-parser，parseText
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
  
  parent(父节点):       父vnode，只有自定义组件对应的根元素对应的vnode才有parent，指向<TestComps></TestComps>

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

### 模板生成详细vnode
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
### 模板=》vnode关系树；模板=》vm关系树
假定有如下结构的模板
```
// new Vue的template，对应的实例记为vm1
<div vnode1>
  <p vnode2></p>
  <TestComps vnode3
             testAttr="hahha"
             @click="clicked"
             :username="username"
             :password="password"></TestComps>
</div>

// TestComps的template，对应的实例记为vm2
<div vnode4>
  <span vnode5></span>
  <p vnode6></p>
</div>
```
生成的vnode的关系树为
```
vnode1={
  tag:'div',
  children:[vnode2,vnode3]
}
vnode3={
  tag:'TestComps',
  children:undefined,
  parent:undefined
}
vnode4={
  tag:'div',
  children:[vnode5,vnode6],
  parent:vnode3             //这一点关系很重要
}
```
生成的vm关系树为
```
vm1={
  $data:{password: "123456",username: "aliarmo"} //组件对应state
	$props:{} //使用组件时候传下来到模板里面的数据
  $attrs:{},
  $children:[vm2],             
  $listeners:{}
  $options: {
    components: {}
    parent: undefined   //父组件实例
    propsData: undefined    //使用组件时候传下来到模板里面的数据
    _parentVnode: undefined 
  }
  $parent:undefiend               //当前组件的父组件实例
  $refs:{}                 //当前组件里面包含的dom引用
  $root:vm1                 //根组件实例
  $vnode:undefined                 //组件被引用时候的那个vnode，比如<TestComps></TestComps>
  _vnode:vnode1       //当前组件模板根元素所对应的vnode对象
}

vm2={
  $data:{} //组件对应state
	$props:{password: "123456",username: "aliarmo"} //使用组件时候传下来到模板里面的数据
  $attrs:{testAttr:'hahha'},
  $children:[],             
  $listeners:{click:fn}
  $options: {
    components: {}
    parent: vm1   //父组件实例
    propsData: {password: "123456",username: "aliarmo"}    //使用组件时候传下来到模板里面的数据
    _parentVnode: vnode3 
  }
  $parent:vm1               //当前组件的父组件实例
  $refs:{}                 //当前组件里面包含的dom引用
  $root:vm1                 //根组件实例
  $vnode:vnode3                 //组件被引用时候的那个vnode，比如<TestComps></TestComps>
  _vnode:vnode4       //当前组件模板根元素所对应的vnode对象
}
```


### Vue Watcher体系
#### 整个体系的建立过程：
1、创建组件实例的时候会对data和props进行observer，
2、对传入的props进行浅遍历，重新设定属性的属性描述符get和set，如果props的某个属性值为对象，那么这个对象在父组件是被深度observe过的，所以props是浅遍历
2、observer会深度遍历data，对data所包含属性重新定义，即defineReactive，重新设定属性描述符的get和set
3、在mountComponent的时候，会new Wacther，当前watcher实例会被pushTarget，设定为目标watcher，然后执行vm._update(vm._render(), hydrating)，执行render函数导致属性的get函数被调用，每个属性会对应一个dep实例，在这个时候，dep实例关联到组件对应的watcher，实现依赖收集，关联后popTarget。
4、如果有子组件，会导致子组件的实例化，重新执行上述步骤
#### state变动响应过程：
1、当state变动后，调用属性描述符的set函数，dep会通知到关联的watcher进入到nextTick任务里面，这个watcher实例的run函数包含vm._update(vm._render(), hydrating)，执行这个run函数，导致重新生成vnode，进行patch，经过diff，达到更新UI目的
#### 总结：
1、一个组件对应一个观察者，在挂载组件的时候创建这个观察者，mountComponent
2、组件的state，包含data，props都是被观察者，被观察者的任何变化会被通知到观察者
3、被观察者的变动导致观察者执行的动作是vm._update(vm._render(), hydrating),组件重新render和patch
观察者包含对变动做出响应的定义，一个组件对应一个观察者对应组件里面的所有被观察者，被观察者可能被用于其他组件，那么一个被观察者会对应多个观察者，当被观察者发生变动时，通知到所有观察者做出更新响应。
PS：
* 观察者对应Watcher
* 响应就是vm._update(vm._render(), hydrating)
* 被观察者是state，用Dep来连接state与Watcher


### Vue vnode diff算法
#### vnode diff 概念：
##### vnode
vnode是虚拟node节点，是具体平台元素对象的进一步抽象，每一个元素对应一个vnode，可通过vnode结构完整还原具体平台元素结构。
下面以web平台来解释vnode。对于web，假定有如下结构：
```
<div class="box" @click="onClick">------------------对应一个vnode
 <p class="content">哈哈</p>-------对应一个vnode
 <div></div>-----------------------对应一个vnode
</div>
```
经过Vue的compile模块将生成渲染函数，执行这个渲染函数就会生成对应的vnode结构：
```
//这里我只列出关键的vnode信息
{
  tag:'div',
  data:{attr:{},staticClass:'box',on:{click:onClick}},
  children:[{
    tag:'p',
    data:{attr:{},staticClass:'content',on:{}},
    children:[{
      tag:'',
      data:{},
      text:'哈哈'
    }]
  },{
    tag:'div',
    data:{attr:{},on:{}},
  }]  
}
```
最外层的div对应一个vnode，包含两个孩子vnode
##### sameVnode，需要同时满足1&&2，或者1&&3
1、vnode的key值相等，例如 <Comps1 key="key1" />,<Comps2 key="key2" />，key值就不相等，<Comps1 key="key1" />,<Comps2 key="key1" />，key值就是相等的，<div></div>,<p></p>,这两个的key值是undefined，key值相等，这个是sameVnode的大前提
2、vnode的tag相同，都是注释或者都不是注释，同时定义或未定义data，标签为input则type必须相同，vnode.data.domProps.innerHTML || vnode.data.domProps.textContent为false
3、isAsyncPlaceholder,asyncFactory


#### 整个vnode diff流程：
大前提，要看懂这个vnode diff，务必先明白vnode是啥，如何生成的，vnode与elm的关系
1、如果两个vnode是sameVnode，则进行patch vnode
2、patch vnode
（1）首先vnode的elm指向oldVnode的elm
（2）使用vnode的数据更新elm的attr，class，style，domProps，events等
（3）如果vnode是文本节点，则直接设置elm的text，结束
（4）如果vnode是非文本节点&&有孩子&&oldVnode没有孩子，则elm直接append
（5）如果vnode是非文本节点&&没有孩子&&oldVnode有孩子,则直接移除elm的孩子节点
（6）如果非文本节点&&都有孩子节点，则updateChildren，进入diff 算法
3、diff 算法
```
//oldVnode对应的dom结构,这里以web平台为例
<div>
  <div class="header" :class="topHeader">
    <div :class="innerClass"></div>
  </div>
  <p key="p1">{{content}}</p>
  <span class="icon">我是icon</span>
</div>

//vnode对应的dom结构,这里以web平台为例
<div>
  <div class="header" :class="topHeader">
    <div :class="innerClass"></div>
  </div>
  <p key="p1">{{content}}</p>
  <span class="icon">我是icon</span>
</div>
```
假设给定上面结构，如何用newChildrenVnodes替换oldChildrenVnodes，最简单的方式莫过于，遍历newChildrenVnodes，直接重新生成这个html片段，皆大欢喜。但是这样做会
不断的createElement，对性能有影响，于是前辈们就想出了这个diff算法，diff算法的原理是通过移动、新增、删除和替换oldChildrenVnodes对应的结构来生成newChildrenVnodes对应的结构，并且每个元素只能被复用一次。要明确传入diff算法的是两个sameVnode的孩子节点，从两者的开头和结尾位置，同时往中间靠，直到两者中的一个到达中间。

（1）取两者最左边的节点，判断是否为sameVnode，如果是则进行上述的第二步，整个流程走完后，此时elm的class，style，events等已经更新了，elm的children结构也通过前面说的整个流程得到了更新，这时候就看是否需要移动这个elm了，因为都是孩子的最左边节点，因此位置不变，最左边节点位置向前移动一步
（2）如果不是（1）所述case，取两者最右边的节点，跟（1）的判定流程一样，不过是最右边节点位置向前移动一步
（3）如果不是（1）（2）所述case，取oldChildrenVnodes最左边节点和newChildrenVnodes最右边节点，跟（1）的判定流程一样，不过，elm的位置需要移动到oldVnode最右边elm的右边，因为vnode取的是最右边节点，如果与oldVnode的最右边节点是sameVnode的话，位置是不用改变的，因此newChildrenVnodes的最右节点和oldChildrenVnodes的最右节点位置是对应的，但由于是复用的oldChildrenVnodes的最左边节点，oldChildrenVnodes最右边节点还没有被复用，因此不能替换掉，所以移动到oldChildrenVnodes最右边elm的右边。然后oldChildrenVnodes最左边节点位置向前移动一步，newChildrenVnodes最右边节点位置向前移动一步
（4）如果不是（1）（2）（3）所述case，取oldChildrenVnodes最右边节点和newChildrenVnodes最左边节点，跟（1）的判定流程一样，不过，elm的位置需要移动到oldChildrenVnodes最左边elm的左边，因为vnode取的是最左边节点，如果与oldChildrenVnodes的最左边节点是sameVnode的话，位置是不用改变的，因此newChildrenVnodes的最左节点和oldChildrenVnodes的最左节点位置是对应的，但由于是复用的oldChildrenVnodes的最右边节点，oldChildrenVnodes最左边节点还没有被复用，因此不能替换掉，所以移动到oldChildrenVnodes最左边elm的左边。然后oldChildrenVnodes最右边节点位置向前移动一步，newChildrenVnodes最左边节点位置向前移动一步
（5）如果不是（1）（2）（3）（4）所述case，在oldChildrenVnodes中寻找与newChildrenVnodes最左边节点是sameVnode的oldVnode，如果没有找到，则用这个新的vnode创建一个新element，插入位置如后所述，如果找到了，则跟（1）的判定流程一样，不过插入的位置是oldChildrenVnodes的最左边节点的左边，因为如果newChildrenVnodes最左边节点与oldChildrenVnodes最左边节点是sameVnode的话，位置是不用变的，并且复用的是oldChildrenVnodes中找到的oldVNode的elm。被复用过的oldVnode后面不会再被取出来。然后newChildrenVnodes最左边节点位置向前移动一步
（6）经过上述步骤，oldChildrenVnodes或者newChildrenVnodes的最左节点与最右节点重合，退出循坏
（7）如果是oldChildrenVnodes的最左节点与最右节点先重合，说明newChildrenVNodes还有节点没有被插入，递归创建这些节点对应元素，然后插入到oldChildrenVnodes的最左节点的右边或者最右节点的左边，因为是从两者的开始和结束位置向中间靠拢，想想，如果newChildrenVNodes剩余的第一个节点与oldChildrenVnodes的最左边节点为sameVnode的话，位置是不用变的
（8）如果是newChildrenVnodes的最左节点与最右节点先重合，说明oldChildrenVnodes中有一段结构没有被复用，开始和结束位置向中间靠拢，因此没有被复用的位置是oldChildrenVnodes的最左边和最右边之间节点，删除节点对应的elm即可

### 自定义组件如何渲染，父组件数据如何传入子组件
```
假定下面为ParentComps组件的模板
<div>-----------------------vnode1
  <span></span>-------------vnode2
  <TestComps :username="username"
             :password="password"></TestComps>    ---vnode3  然而是一个占位符
  <p></p>-------------------vnode4
</div>
```
1. 执行ParentComps的render函数，分别生成vnode1，vnode2，vnode3，vnode4
2. 自定义组件TestComps的vnode3的componentOptions里面包含ParentComps
传给TestComps的propsData，以及事件定义（propsData是在执行渲染函数的时候生成，可以参考上述 模板生成详细vnode），然后会组成一个如下对象传递给TestComps的构造函数，并与组件options（我们需要知道组件的options会被挂载在构造函数上），global options合并
```
 {
  parent: ParentComps组件实例,
  _isComponent: true,
  _parentVnode:vnode3
 }
```
3. 构造函数执行的时候就会使用propsData，以上面的TestComps举例，具体使用如下：
构造函数的prototype上挂载props的所有值，然后在vm上重新定义username和password。访问vm.username，其实就是访问
vm.__proto__.username，也就是访问vm.__proto__.username的get，get里面的实现是访问vm._props.username，
在执行构造函数的过程中，在vm上挂载_props对象，它属性来源于props，值来源于propsData，通过defineProperty定义
因此vm._props.username所获取的值就是propsData提供的值，这解释了“父组件数据如何传入子组件”

4. 然后执行TestComps的render函数，生成TestComps对应模板的所有vnode，并通过这些vnode渲染出对应element

### 父组件state变化如何导致子组件也发生变化
1. 父组件state更新后，会导致渲染函数重新执行，生成新的vnode，在oldVnode和newVnode patch的过程中，如果遇到的是组件vnode，会updateChildrenComponent，这里面做的操作就是更新子组件的props，因为子组件是有监听props属性的变动的，导致子组件re-render

### 父组件传入一个对象给子组件，子组件改变传入的对象props，父组件又是如何被更新到的
```
// 假定父组件传person对象给子组件SubComps
Vue.component('ParentComps',{
  data(){
    return {
      person:{
        username:'aliarmo',
        pwd:123
      }
    }
  },
  template:`
    <div>
      <p>{{person.username}}</p>
      <SubComps :person="person" />
    </div>
  `
})
```
大前提：如果父组件传给子组件的props中有对象，那么子组件接收到的是这个对象的引用。也就是ParentComps中的this.person和SubComps中的this.person指向同一个对象
现在我们在SubComps里面，更新person对象的某个属性,如：this.person.username='wmy'
这样会导致ParentComps和SubComps的更新，为什么呢？因为Vue在ParentComps中会深度递归观察对象的每个属性，在第一次执行ParentComps的render的时候，绑定ParentComps的Watcher，传入到SubComps后，不会对传入的对象在进行观察，在第一次执行SubComps的render的时候，会绑定到SubComps的Watcher，因此当SubComps改变了this.person.username的值，会通知到两个Watcher，导致更新。这很好的解释了凭空在传入的props属性对象上挂载新的属性不触发渲染，因为传入的props属性对象是在父组件被观察的

### 指令
指令在Vue中是具有特定含义的属性，指令分两类，一类是编译时处理，在生成的render函数上体现，如：v-if，v-for，另外一类是运行时使用，更多的是对生成的具体平台元素操作，web平台的话就是对dom的操作

### 从源码看出的优化点
1. 组件越小越好，特别是列表渲染，列表项最好做出组件的形式，这样state变化造成的改变是最小的，比如你改变列表项某个state值，那么最终更新的就是使用了这个state的组件，其他的组件不会被通知到更新，来自watcher

2. beforeCreate和created生命周期里面变动的state不会导致re-redner，因为那时候组件还没有绑定watcher

3. 被key过的节点，如果key值发生了改变，在re-render的时候，会重新根据新的vnode生成element，不会跟老的vnode进行diff


编译后的结果只有在具体的上下文中才能发挥效力


/* @flow */
// MVVM model，view，view-model
/**
 * 定义vnode patch所需要的nodeOps，如果是其他平台，可自行定义这些元素的操作方法，对于web来说nodeOps是要创建真正的dom对象
 * 定vnode patch所需要的modules，对于web来说，modules是用来操作dom属性的方法
 *
 * 1、总结下，web平台为了复用vue的core和compiler，做了啥
 * 提供web平台需要的工具方法
 * 提供web平台的指令语法糖
 * 提供web平台特有的用于做动画的组件
 * 提供$mount函数
 * 提供vnode patch所需要的nodeOps和modules
 * 提供使用vue的compiler所需参数，比如style，class和v-model等需要编译成什么样
 *
 * 所以，如果想开发其他的平台的框架，可复用vue的runtime，提供上述专有的方法就好，比如weex平台，又如hippy-vue
 *
 * 2、总结下，vue的core和compiler需要哪些输入才能正常复用
 *
 * 3、总结下，vue的core到底干啥了，就是你用他这个core可以装什么逼
 * 组件化
 * 指令特性
 * 状态响应式，更新状态，即可更新对应UI
 * 生命周期
 * 通过vnode获取UI，diff更新UI
 * 从vnode到UI，递归，从状态变更到到重新执行render生成newVnode，在到diff，在到更新UI
 *
 * 4、总结下，vue的compiler到底干啥了，就是你用他这个compiler可以装什么逼
 * 定义了模板语法
 * 将模板语法编译成render和renderStatic函数，render函数可以生成vnode
 * 提供接口，可以做定制化的编译，详细请看web的compiler是怎么获取定制化编译能力的
 * props down，event up
 * 从template到render函数
 */
// 牛顿总是说自己发现万有引力是站在巨人的肩膀上，但能爬到巨人的肩膀上也实属不易


/**
 * Vue.component其实是对Vue类的继承，返回一个继承后的构造函数，并配置好组件名对应这个构造函数，构造函数上挂有传入的options，
 * 便于解析到组件的时候调用这个构造函数创建组件，
 * 自定义组件是继承自Vue的构造函数，内置组件是一个对象
 */

/**
 * core/global-api
 * 初始换Vue.config和Vue的全局api，Vue的内置组件KeepAlive
 * Vue.config，Vue.options，Vue.use，Vue.mixin，Vue.component，Vue.directive，Vue.filter
 */

### core总述
现在我们终于可以理一下，从new Vue()开始，core里面发生了些什么
1. new Vue()或者new自定义组件构造函数（继承自Vue）
2. 初始化，props，methods，computed，data，watch，并给state加上Observe，调用生命周期created
3. 开始mount组件，mount之前确保render函数的生成
4. new Watcher，导致render和patch，注意一个watcher对应一个组件，watcher对变化的响应是重新执行render生成vnode进行patch
5. render在当前组件上下文（组件实例）执行，生成对应的vnode结构
6. 如果没有oldVnode，那patch就是深度遍历vnode，生成具体的平台元素，给具体的平台元素添加属性和绑定事件，调用自定义指令提供的钩子函数，并append到已存在的元素上，在遍历的过程中，如果遇到的是自定义组件，则从**步骤1**开始重复
7. 如果有oldVnode，那patch就是利用vnode diff算法在原有的平台元素上进行修修补补，不到万不得已不创建新的平台元素
8. state发生变化，通知到state所在组件对应的watcher，重新执行render生成vnode进行patch，也就是回到**步骤4**
